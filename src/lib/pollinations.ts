import {
  createSeed,
  getAspectRatioOption,
  normalizeAspectRatio,
  suggestAspectRatioForPlatform,
} from '@/lib/aspect-ratios';
import {
  defaultAudioModel,
  filterTextToAudioModels,
  toAudioUnavailableReason,
} from '@/lib/audio';
import { appEnv } from '@/lib/env';
import {
  buildCampaignPlan,
  CampaignPayloadError,
  campaignResponseJsonSchema,
  parseCampaignPayload,
  parseSectionPayload,
  sectionSchemas,
} from '@/schema/campaign';
import { trimPreview, toErrorMessage } from '@/lib/utils';
import type {
  AudioAvailability,
  CampaignBrief,
  CampaignPlan,
  GeneratedImageAsset,
  GenerationDebugAttempt,
  GenerationDebugInfo,
  GenerationFailurePhase,
  KeyInfo,
  KeyInspection,
  ModelCatalog,
  ModelInfo,
  RegenerableSection,
} from '@/types/campaign';

const pollinationsBaseUrl = 'https://gen.pollinations.ai';
const chatRequestTimeoutMs = 30_000;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type PollinationsChatResponse = {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason?: string | null;
    message: {
      role: 'assistant';
      content:
        | string
        | Array<{
            text?: string;
            content?: string;
            type?: string;
          }>
        | null;
      audio?: {
        transcript: string;
        data: string;
        id: string;
        expires_at: number;
      };
    };
  }>;
};

type AccountProfile = {
  name: string;
  email: string;
  githubUsername?: string;
  image?: string;
  tier: string;
  createdAt: string;
  nextResetAt?: string;
};

type AccountBalance = {
  balance: number;
};

const fallbackTextModels: ModelInfo[] = [
  {
    name: appEnv.defaultTextModel,
    description: 'Configured default text model',
  },
];

const fallbackImageModels: ModelInfo[] = [
  {
    name: appEnv.defaultImageModel,
    description: 'Configured default image model',
  },
];

const fallbackAudioModels: ModelInfo[] = [
  {
    name: defaultAudioModel,
    description: 'Configured default audio model',
    input_modalities: ['text'],
    output_modalities: ['audio'],
  },
];

class CampaignGenerationError extends Error {
  debug: GenerationDebugInfo;

  constructor(message: string, debug: GenerationDebugInfo) {
    super(message);
    this.name = 'CampaignGenerationError';
    this.debug = debug;
  }
}

export function getGenerationDebugInfo(error: unknown) {
  return error instanceof CampaignGenerationError ? error.debug : undefined;
}

function createHeaders(apiKey?: string, contentType?: string) {
  const headers = new Headers();

  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  return headers;
}

async function readPollinationsError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
      message?: string;
    };

    if (payload.error?.message) {
      return payload.error.message;
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    // Fall through to a text body.
  }

  try {
    const text = await response.text();

    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore secondary read failures.
  }

  return `Pollinations request failed with status ${response.status}.`;
}

async function fetchJson<TResponse>(options: {
  path: string;
  apiKey?: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(
      new DOMException(
        'The Pollinations request took too long and timed out.',
        'AbortError',
      ),
    );
  }, options.timeoutMs ?? 45_000);

  const abortFromParent = () => {
    controller.abort(options.signal?.reason);
  };

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  try {
    const response = await fetch(`${pollinationsBaseUrl}${options.path}`, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers: createHeaders(
        options.apiKey,
        options.body ? 'application/json' : undefined,
      ),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readPollinationsError(response));
    }

    return (await response.json()) as TResponse;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromParent);
  }
}

async function fetchBinary(options: {
  path: string;
  apiKey?: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(
      new DOMException(
        'The Pollinations request took too long and timed out.',
        'AbortError',
      ),
    );
  }, options.timeoutMs ?? 45_000);

  const abortFromParent = () => {
    controller.abort(options.signal?.reason);
  };

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  try {
    const response = await fetch(`${pollinationsBaseUrl}${options.path}`, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers: createHeaders(
        options.apiKey,
        options.body ? 'application/json' : undefined,
      ),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readPollinationsError(response));
    }

    return response;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromParent);
  }
}

function normalizeModelEntry(entry: unknown): ModelInfo | null {
  if (typeof entry === 'string' && entry.trim()) {
    return { name: entry.trim() };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const name =
    typeof record.name === 'string'
      ? record.name.trim()
      : typeof record.id === 'string'
        ? record.id.trim()
        : '';

  if (!name) {
    return null;
  }

  return {
    name,
    description:
      typeof record.description === 'string'
        ? record.description.trim()
        : undefined,
    aliases: Array.isArray(record.aliases)
      ? record.aliases.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : undefined,
    voices: Array.isArray(record.voices)
      ? record.voices.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : undefined,
    tier: typeof record.tier === 'string' ? record.tier : undefined,
    community:
      typeof record.community === 'boolean' ? record.community : undefined,
    input_modalities: Array.isArray(record.input_modalities)
      ? record.input_modalities.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : undefined,
    output_modalities: Array.isArray(record.output_modalities)
      ? record.output_modalities.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : undefined,
    tools: typeof record.tools === 'boolean' ? record.tools : undefined,
    vision: typeof record.vision === 'boolean' ? record.vision : undefined,
    audio: typeof record.audio === 'boolean' ? record.audio : undefined,
    reasoning:
      typeof record.reasoning === 'boolean' ? record.reasoning : undefined,
    uncensored:
      typeof record.uncensored === 'boolean' ? record.uncensored : undefined,
  };
}

function normalizeModelList(payload: unknown, fallback: ModelInfo[]) {
  if (!Array.isArray(payload)) {
    return fallback;
  }

  const models = payload
    .map(normalizeModelEntry)
    .filter((model): model is ModelInfo => Boolean(model));

  return models.length > 0 ? models : fallback;
}

function ensurePreferredModel(models: ModelInfo[], preferred: string) {
  if (models.some((model) => model.name === preferred)) {
    return models;
  }

  return [{ name: preferred, description: 'Saved preference' }, ...models];
}

function buildBriefPrompt(brief: CampaignBrief) {
  return [
    `Product or service: ${brief.productName}`,
    `Description: ${brief.description}`,
    `Audience: ${brief.audience}`,
    `Platform goal: ${brief.platform}`,
    `Tone: ${brief.tone}`,
    `Visual style: ${brief.visualStyle}`,
    `Brand colors: ${brief.brandColors || 'None provided'}`,
    `Offer / CTA: ${brief.offer || 'None provided'}`,
    `Language: ${brief.language}`,
    `Notes: ${brief.notes || 'None provided'}`,
  ].join('\n');
}

function createSystemPrompt() {
  return [
    'You are HiveLaunch, a senior campaign strategist and creative director.',
    'Turn the user brief into a launch-ready mini campaign kit.',
    'Keep every output concise, commercially usable, and specific to the platform.',
    'Do not use markdown in the JSON fields.',
    'Write in the requested language.',
  ].join(' ');
}

function createJsonModeSystemPrompt() {
  return [
    'You are HiveLaunch, a senior campaign strategist and creative director.',
    'Return concise production-ready JSON only.',
    'Keep every line commercially usable, platform-specific, and free of markdown.',
    'Keep aspectRatioSuggestion to 1:1, 4:5, 16:9, or 9:16.',
    'Write in the requested language.',
  ].join(' ');
}

function createCampaignJsonPrompt(brief: CampaignBrief) {
  return [
    buildBriefPrompt(brief),
    '',
    'Return only a JSON object with these exact top-level keys:',
    'conceptSummary, audienceInsight, campaignAngles, headlines, captions, ctas, imagePrompts, voiceoverScript.',
    'Requirements:',
    '- conceptSummary and audienceInsight: one concise paragraph each.',
    '- campaignAngles, headlines, captions, and ctas: exactly 3 items each.',
    '- imagePrompts: exactly 3 objects with title, prompt, aspectRatioSuggestion, and optional artDirectionNotes.',
    '- aspectRatioSuggestion must be one of 1:1, 4:5, 16:9, or 9:16.',
    '- Make the output specific to the platform and product brief.',
  ].join('\n');
}

function createRegenerationPrompt(
  section: RegenerableSection,
  brief: CampaignBrief,
  plan: CampaignPlan,
) {
  const briefSummary = buildBriefPrompt(brief);
  const existingContext = JSON.stringify(
    {
      conceptSummary: plan.conceptSummary,
      audienceInsight: plan.audienceInsight,
      campaignAngles: plan.campaignAngles,
      headlines: plan.headlines,
      captions: plan.captions,
      ctas: plan.ctas,
      imagePrompts: plan.imagePrompts,
      voiceoverScript: plan.voiceoverScript,
    },
    null,
    2,
  );

  const instructionMap: Record<RegenerableSection, string> = {
    campaignAngles:
      'Regenerate exactly three new campaignAngles that feel distinct from the current set.',
    headlines:
      'Regenerate exactly three new headlines that remain punchy and platform-appropriate.',
    captions:
      'Regenerate exactly three new captions that sound ready to publish.',
    ctas: 'Regenerate exactly three CTA options with different urgency styles.',
    imagePrompts:
      'Regenerate exactly three imagePrompts with fresh scenes, strong art direction, and aspectRatioSuggestion values.',
    voiceoverScript:
      'Regenerate a short voiceoverScript suitable for a 15 to 25 second spoken spot.',
  };

  return [
    briefSummary,
    '',
    'Existing campaign context:',
    existingContext,
    '',
    instructionMap[section],
    'Return only a JSON object containing the requested field.',
  ].join('\n');
}

async function requestChatCompletion(options: {
  apiKey: string;
  body: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  return fetchJson<PollinationsChatResponse>({
    path: '/v1/chat/completions',
    apiKey: options.apiKey,
    method: 'POST',
    body: options.body,
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? chatRequestTimeoutMs,
  });
}

function pickChatText(response: PollinationsChatResponse) {
  const content = response.choices[0]?.message?.content;
  const text =
    typeof content === 'string'
      ? content.trim()
      : Array.isArray(content)
        ? content
            .map((part) => {
              if (typeof part?.text === 'string') {
                return part.text;
              }

              if (typeof part?.content === 'string') {
                return part.content;
              }

              return '';
            })
            .join('\n')
            .trim()
        : '';

  if (!text) {
    if (response.choices[0]?.finish_reason === 'length') {
      throw new Error(
        'Pollinations returned an empty completion before emitting campaign JSON. HiveLaunch will try a more reliable request mode.',
      );
    }

    throw new Error('Pollinations returned an empty text response.');
  }

  return text;
}

function createAttempt(
  label: string,
  options: {
    error: unknown;
    model?: string;
    rawText?: string;
  },
): GenerationDebugAttempt {
  return {
    label,
    model: options.model,
    error: toErrorMessage(options.error),
    rawResponsePreview: options.rawText ? trimPreview(options.rawText) : undefined,
  };
}

function mapFailurePhase(
  error: unknown,
  fallbackAttempted = false,
): GenerationFailurePhase {
  if (fallbackAttempted) {
    return 'fallback';
  }

  if (error instanceof CampaignPayloadError) {
    return error.stage;
  }

  return 'request';
}

function createGenerationFailure(
  options: {
    phase: GenerationFailurePhase;
    attempts: GenerationDebugAttempt[];
    rawResponsePreview?: string;
    notes: string[];
  },
  message = 'HiveLaunch could not turn the Pollinations response into a campaign kit. Open debug details for the raw response and parser notes.',
) {
  return new CampaignGenerationError(message, {
    phase: options.phase,
    attempts: options.attempts,
    rawResponsePreview: options.rawResponsePreview,
    notes: options.notes,
  });
}

function setQueryValue(
  url: URL,
  key: string,
  value: boolean | number | string | undefined,
) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  url.searchParams.set(key, String(value));
}

function buildImageRequestUrl(options: {
  apiKey: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  seed: number;
  quality: 'low' | 'medium' | 'high' | 'hd';
  safeMode: boolean;
  privateMode: boolean;
  enhancePrompts: boolean;
}) {
  const url = new URL(
    `/image/${encodeURIComponent(options.prompt)}`,
    pollinationsBaseUrl,
  );

  setQueryValue(url, 'model', options.model);
  setQueryValue(url, 'width', options.width);
  setQueryValue(url, 'height', options.height);
  setQueryValue(url, 'seed', options.seed);
  setQueryValue(url, 'quality', options.quality);
  setQueryValue(url, 'safe', options.safeMode);
  setQueryValue(url, 'private', options.privateMode);
  setQueryValue(url, 'enhance', options.enhancePrompts);
  setQueryValue(url, 'key', options.apiKey);

  return url.toString();
}

function sanitizeGeneratedUrl(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete('key');
  return parsed.toString();
}

export async function discoverModels(apiKey?: string): Promise<ModelCatalog> {
  const [textResult, imageResult, audioResult] = await Promise.allSettled([
    fetchJson<unknown>({ path: '/text/models', apiKey }),
    fetchJson<unknown>({ path: '/image/models', apiKey }),
    fetchJson<unknown>({ path: '/audio/models', apiKey }),
  ]);

  const textModels =
    textResult.status === 'fulfilled'
      ? ensurePreferredModel(
          normalizeModelList(textResult.value, fallbackTextModels),
          appEnv.defaultTextModel,
        )
      : fallbackTextModels;
  const imageModels =
    imageResult.status === 'fulfilled'
      ? ensurePreferredModel(
          normalizeModelList(imageResult.value, fallbackImageModels),
          appEnv.defaultImageModel,
        )
      : fallbackImageModels;
  const audioModels =
    audioResult.status === 'fulfilled'
      ? ensurePreferredModel(
          filterTextToAudioModels(
            normalizeModelList(audioResult.value, fallbackAudioModels),
          ),
          defaultAudioModel,
        )
      : fallbackAudioModels;

  const errors = [
    textResult.status === 'rejected'
      ? toErrorMessage(textResult.reason)
      : undefined,
    imageResult.status === 'rejected'
      ? toErrorMessage(imageResult.reason)
      : undefined,
    audioResult.status === 'rejected'
      ? toErrorMessage(audioResult.reason)
      : undefined,
  ].filter((message): message is string => Boolean(message));

  return {
    textModels,
    imageModels,
    audioModels,
    source: errors.length === 0 ? 'live' : 'fallback',
    error:
      errors.length > 0
        ? errors.join(' ')
        : undefined,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function checkAudioSupport(options: {
  apiKey: string;
  audioModel: string;
  voice: string;
}): Promise<AudioAvailability> {
  try {
    const response = await fetchBinary({
      path: '/v1/audio/speech',
      apiKey: options.apiKey,
      method: 'POST',
      body: {
        model: options.audioModel,
        input: 'Hi.',
        voice: options.voice,
      },
      timeoutMs: 20_000,
    });

    await response.arrayBuffer();

    return { status: 'available' };
  } catch (error) {
    return {
      status: 'unavailable',
      reason: toAudioUnavailableReason(error, options.audioModel),
    };
  }
}

export async function inspectKey(apiKey: string): Promise<KeyInspection> {
  const warnings: string[] = [];
  const keyInfo = await fetchJson<KeyInfo>({
    path: '/account/key',
    apiKey,
  });
  const accountPermissions = keyInfo.permissions?.account || [];

  let profileName: string | undefined;
  let accountTier: string | undefined;
  let balance: number | undefined;

  if (accountPermissions.includes('profile')) {
    try {
      const profile = await fetchJson<AccountProfile>({
        path: '/account/profile',
        apiKey,
      });
      profileName = profile.name || profile.githubUsername;
      accountTier = profile.tier;
    } catch (error) {
      warnings.push(`Profile lookup unavailable: ${toErrorMessage(error)}`);
    }
  }

  if (accountPermissions.includes('balance')) {
    try {
      const balanceResponse = await fetchJson<AccountBalance>({
        path: '/account/balance',
        apiKey,
      });
      balance = balanceResponse.balance;
    } catch (error) {
      warnings.push(`Balance lookup unavailable: ${toErrorMessage(error)}`);
    }
  }

  return {
    keyInfo,
    profileName,
    accountTier,
    balance,
    warnings,
  };
}

export async function generateCampaignKit(options: {
  apiKey: string;
  brief: CampaignBrief;
  textModel: string;
  imageModel: string;
  audioModel: string;
}) {
  const messages: ChatMessage[] = [
    { role: 'system', content: createSystemPrompt() },
    {
      role: 'user',
      content: [
        buildBriefPrompt(options.brief),
        '',
        'Return one concise concept summary, one audience insight, three campaign angles, three headlines, three captions, three CTAs, three image prompt recipes, and an optional short voiceover script.',
      ].join('\n'),
    },
  ];

  const baseBody = {
    messages,
    model: options.textModel,
    temperature: 0.9,
    max_tokens: 1800,
    reasoning_effort: 'medium',
  } satisfies Record<string, unknown>;
  const tolerantBody = {
    messages: [
      { role: 'system', content: createJsonModeSystemPrompt() },
      {
        role: 'user',
        content: createCampaignJsonPrompt(options.brief),
      },
    ],
    model: options.textModel,
    temperature: 0.7,
    max_tokens: 1400,
    reasoning_effort: 'low',
  } satisfies Record<string, unknown>;
  const shouldTryStrictSchema = options.textModel.trim().toLowerCase() !== 'openai';

  const attempts: GenerationDebugAttempt[] = [];
  let strictFailure: unknown;
  let strictRawText: string | undefined;
  let strictModel = options.textModel;

  if (shouldTryStrictSchema) {
    try {
      const response = await requestChatCompletion({
        apiKey: options.apiKey,
        body: {
          ...baseBody,
          response_format: {
            type: 'json_schema',
            json_schema: campaignResponseJsonSchema,
          },
        },
        timeoutMs: chatRequestTimeoutMs,
      });
      const rawText = pickChatText(response);
      strictRawText = rawText;
      strictModel = response.model || options.textModel;
      const payload = parseCampaignPayload(rawText);

      return buildCampaignPlan(
        options.brief,
        payload,
        {
          textModel: strictModel,
          imageModel: options.imageModel,
          audioModel: options.audioModel,
        },
        rawText,
      );
    } catch (primaryError) {
      strictFailure = primaryError;
      attempts.push(
        createAttempt('Strict schema attempt', {
          error: primaryError,
          model: strictModel,
          rawText: strictRawText,
        }),
      );
    }
  }

  let fallbackRawText: string | undefined;

  try {
    const fallbackResponse = await requestChatCompletion({
      apiKey: options.apiKey,
      body: {
        ...tolerantBody,
        response_format: {
          type: 'json_object',
        },
      },
      timeoutMs: chatRequestTimeoutMs,
    });
    const rawText = pickChatText(fallbackResponse);
    fallbackRawText = rawText;
    const payload = parseCampaignPayload(rawText);
    const plan = buildCampaignPlan(
      options.brief,
      payload,
      {
        textModel: fallbackResponse.model || options.textModel,
        imageModel: options.imageModel,
        audioModel: options.audioModel,
      },
      rawText,
    );

    const parsingNotes = [
      shouldTryStrictSchema
        ? `HiveLaunch recovered with JSON object mode after strict schema mode failed: ${toErrorMessage(strictFailure)}`
        : 'HiveLaunch used compact JSON object mode because the openai alias did not reliably return strict schema output during live verification.',
    ];

    if (strictFailure instanceof CampaignPayloadError) {
      parsingNotes.push(...(strictFailure.details || []).slice(0, 4));
    }

    return {
      ...plan,
      debug: {
        rawResponsePreview: trimPreview(rawText),
        parsingNotes,
      },
    };
  } catch (fallbackError) {
    attempts.push(
      createAttempt('JSON object fallback', {
        error: fallbackError,
        model: options.textModel,
        rawText: fallbackRawText,
      }),
    );

    const notes = [
      shouldTryStrictSchema
        ? `Strict schema mode failed: ${toErrorMessage(strictFailure)}`
        : 'HiveLaunch skipped strict schema mode for the openai alias and went straight to compact JSON object mode.',
      `JSON object fallback failed: ${toErrorMessage(fallbackError)}`,
    ];

    if (strictFailure instanceof CampaignPayloadError) {
      notes.push(...(strictFailure.details || []).slice(0, 4));
    }

    if (fallbackError instanceof CampaignPayloadError) {
      notes.push(...(fallbackError.details || []).slice(0, 4));
    }

    throw createGenerationFailure({
      phase: mapFailurePhase(fallbackError, true),
      attempts,
      rawResponsePreview:
        trimPreview(fallbackRawText || strictRawText || '').trim() || undefined,
      notes,
    });
  }
}

export async function regenerateSection(options: {
  apiKey: string;
  brief: CampaignBrief;
  plan: CampaignPlan;
  section: RegenerableSection;
  textModel: string;
}) {
  const response = await requestChatCompletion({
    apiKey: options.apiKey,
    body: {
      messages: [
        { role: 'system', content: createSystemPrompt() },
        {
          role: 'user',
          content: createRegenerationPrompt(
            options.section,
            options.brief,
            options.plan,
          ),
        },
      ],
      model: options.textModel,
      temperature: 1,
      max_tokens: 900,
      response_format: {
        type: 'json_object',
      },
      reasoning_effort: 'low',
    },
  });
  const rawText = pickChatText(response);

  switch (options.section) {
    case 'campaignAngles':
      return parseSectionPayload(sectionSchemas.campaignAngles, rawText);
    case 'headlines':
      return parseSectionPayload(sectionSchemas.headlines, rawText);
    case 'captions':
      return parseSectionPayload(sectionSchemas.captions, rawText);
    case 'ctas':
      return parseSectionPayload(sectionSchemas.ctas, rawText);
    case 'imagePrompts': {
      const parsed = parseSectionPayload(sectionSchemas.imagePrompts, rawText);
      return {
        imagePrompts: parsed.imagePrompts.slice(0, 3).map((item, index) => ({
          id: `${options.plan.imagePrompts[index]?.id || index + 1}`,
          title: item.title.trim(),
          prompt: item.prompt.trim(),
          aspectRatioSuggestion: normalizeAspectRatio(
            item.aspectRatioSuggestion ||
              suggestAspectRatioForPlatform(options.brief.platform),
          ),
          artDirectionNotes: item.artDirectionNotes?.trim() || undefined,
        })),
      };
    }
    case 'voiceoverScript':
      return parseSectionPayload(sectionSchemas.voiceoverScript, rawText);
  }
}

export async function generateVisualAsset(options: {
  apiKey: string;
  recipe: CampaignPlan['imagePrompts'][number];
  imageModel: string;
  imageQuality: 'low' | 'medium' | 'high' | 'hd';
  aspectRatio: GeneratedImageAsset['aspectRatio'];
  safeMode: boolean;
  privateMode: boolean;
  enhancePrompts: boolean;
}) {
  const seed = createSeed();
  const ratio = getAspectRatioOption(options.aspectRatio);
  const requestUrl = buildImageRequestUrl({
    apiKey: options.apiKey,
    prompt: options.recipe.prompt,
    model: options.imageModel,
    width: ratio.width,
    height: ratio.height,
    seed,
    quality: options.imageQuality,
    safeMode: options.safeMode,
    privateMode: options.privateMode,
    enhancePrompts: options.enhancePrompts,
  });
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(await readPollinationsError(response));
  }

  await response.arrayBuffer();

  return {
    id: `${options.recipe.id}-${seed}`,
    recipeId: options.recipe.id,
    title: options.recipe.title,
    prompt: options.recipe.prompt,
    aspectRatio: options.aspectRatio,
    model: options.imageModel,
    url: sanitizeGeneratedUrl(requestUrl),
    seed,
    width: ratio.width,
    height: ratio.height,
    createdAt: new Date().toISOString(),
  } satisfies GeneratedImageAsset;
}

export async function generateVoiceover(options: {
  apiKey: string;
  script: string;
  audioModel: string;
  voice: string;
}) {
  const response = await fetchBinary({
    path: '/v1/audio/speech',
    apiKey: options.apiKey,
    method: 'POST',
    body: {
      model: options.audioModel,
      input: options.script,
      voice: options.voice,
    },
    timeoutMs: 45_000,
  });
  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  const base64 = btoa(binary);

  return {
    script: options.script,
    model: options.audioModel,
    voice: options.voice,
    format: 'mp3' as const,
    audioDataUrl: `data:${contentType};base64,${base64}`,
    generatedAt: new Date().toISOString(),
  };
}
