import { z } from 'zod';

import {
  normalizeAspectRatio,
  suggestAspectRatioForPlatform,
} from '@/lib/aspect-ratios';
import { slugify, trimPreview, uniqueList } from '@/lib/utils';
import type { CampaignBrief, CampaignPlan } from '@/types/campaign';

const conciseLine = z.string().trim().min(6).max(240);
const paragraph = z.string().trim().min(20).max(640);
const campaignFieldKeys = [
  'conceptSummary',
  'audienceInsight',
  'campaignAngles',
  'headlines',
  'captions',
  'ctas',
  'imagePrompts',
  'voiceoverScript',
] as const;
const payloadWrapperKeys = [
  'campaignPlan',
  'campaign',
  'result',
  'data',
  'payload',
  'response',
  'output',
] as const;
const fieldAliases = {
  concept_summary: 'conceptSummary',
  audience_insight: 'audienceInsight',
  campaign_angles: 'campaignAngles',
  image_prompts: 'imagePrompts',
  voiceover_script: 'voiceoverScript',
} as const;

type CampaignFieldKey = (typeof campaignFieldKeys)[number];
type LooseRecord = Record<string, unknown>;

export class CampaignPayloadError extends Error {
  stage: 'response_extraction' | 'schema_validation';
  details?: string[];

  constructor(
    message: string,
    options: {
      stage: 'response_extraction' | 'schema_validation';
      details?: string[];
    },
  ) {
    super(message);
    this.name = 'CampaignPayloadError';
    this.stage = options.stage;
    this.details = options.details;
  }
}

export const briefSchema = z.object({
  productName: z.string().trim().min(2, 'Add the product or service name.'),
  description: z
    .string()
    .trim()
    .min(12, 'Describe what you are selling in one or two clear sentences.'),
  audience: z.string().trim().min(3, 'Tell HiveLaunch who this campaign is for.'),
  platform: z.string().trim().min(2, 'Choose the destination platform or format.'),
  tone: z.string().trim().min(2, 'Set the tone so the campaign voice stays consistent.'),
  visualStyle: z
    .string()
    .trim()
    .min(2, 'Describe the visual direction for generated prompts.'),
  brandColors: z.string().trim().default(''),
  language: z.string().trim().min(2, 'Choose the output language.'),
  offer: z.string().trim().default(''),
  notes: z.string().trim().default(''),
});

export const emptyBrief: CampaignBrief = {
  productName: '',
  description: '',
  audience: '',
  platform: 'Instagram launch post',
  tone: 'Confident and warm',
  visualStyle: 'Cinematic lifestyle with tactile product detail',
  brandColors: '',
  language: 'English',
  offer: '',
  notes: '',
};

const rawImagePromptSchema = z.object({
  title: conciseLine,
  prompt: z.string().trim().min(20).max(1400),
  aspectRatioSuggestion: z.string().trim().min(3).max(120),
  artDirectionNotes: z.string().trim().max(280).optional(),
});

const listSchema = z.array(conciseLine).min(3).max(6);
const captionSchema = z.array(z.string().trim().min(20).max(480)).min(3).max(6);

export const generatedCampaignPayloadSchema = z.object({
  conceptSummary: paragraph,
  audienceInsight: paragraph,
  campaignAngles: listSchema,
  headlines: listSchema,
  captions: captionSchema,
  ctas: listSchema,
  imagePrompts: z.array(rawImagePromptSchema).min(3).max(6),
  voiceoverScript: z.string().trim().min(20).max(560).optional(),
});

export const campaignResponseJsonSchema = {
  name: 'campaign_plan',
  description: 'A structured mini campaign kit for HiveLaunch.',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'conceptSummary',
      'audienceInsight',
      'campaignAngles',
      'headlines',
      'captions',
      'ctas',
      'imagePrompts',
    ],
    properties: {
      conceptSummary: { type: 'string' },
      audienceInsight: { type: 'string' },
      campaignAngles: {
        type: 'array',
        minItems: 3,
        items: { type: 'string' },
      },
      headlines: {
        type: 'array',
        minItems: 3,
        items: { type: 'string' },
      },
      captions: {
        type: 'array',
        minItems: 3,
        items: { type: 'string' },
      },
      ctas: {
        type: 'array',
        minItems: 3,
        items: { type: 'string' },
      },
      imagePrompts: {
        type: 'array',
        minItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'prompt', 'aspectRatioSuggestion'],
          properties: {
            title: { type: 'string' },
            prompt: { type: 'string' },
            aspectRatioSuggestion: { type: 'string' },
            artDirectionNotes: { type: 'string' },
          },
        },
      },
      voiceoverScript: { type: 'string' },
    },
  },
} as const;

export const sectionSchemas = {
  campaignAngles: z.object({ campaignAngles: listSchema }),
  headlines: z.object({ headlines: listSchema }),
  captions: z.object({ captions: captionSchema }),
  ctas: z.object({ ctas: listSchema }),
  imagePrompts: z.object({
    imagePrompts: z.array(rawImagePromptSchema).min(3).max(6),
  }),
  voiceoverScript: z.object({
    voiceoverScript: z.string().trim().min(20).max(560),
  }),
};

function extractBalancedJson(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const startIndex = text.indexOf('{');

  if (startIndex === -1) {
    throw new CampaignPayloadError(
      'Pollinations did not return a JSON object for the campaign kit.',
      {
        stage: 'response_extraction',
      },
    );
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (character === '\\') {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth += 1;
    }

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  throw new CampaignPayloadError(
    'The Pollinations response contained incomplete JSON.',
    {
      stage: 'response_extraction',
    },
  );
}

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function maybeParseJsonString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (
    (!trimmed.startsWith('{') || !trimmed.endsWith('}')) &&
    (!trimmed.startsWith('[') || !trimmed.endsWith(']'))
  ) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function hasCampaignFields(record: LooseRecord) {
  return campaignFieldKeys.some((key) => key in record);
}

function unwrapCampaignPayload(value: unknown): unknown {
  let current = maybeParseJsonString(value);

  for (let depth = 0; depth < 4; depth += 1) {
    if (!isRecord(current)) {
      return current;
    }

    if (hasCampaignFields(current)) {
      return current;
    }

    let wrappedValue: unknown;

    for (const key of payloadWrapperKeys) {
      const candidate = current[key];

      if (candidate !== undefined) {
        wrappedValue = candidate;
        break;
      }
    }

    if (wrappedValue === undefined) {
      return current;
    }

    current = maybeParseJsonString(wrappedValue);
  }

  return current;
}

function normalizePromptShape(item: unknown) {
  const parsed = maybeParseJsonString(item);

  if (!isRecord(parsed)) {
    return parsed;
  }

  const prompt = { ...parsed };

  if (typeof prompt.aspect_ratio_suggestion === 'string') {
    prompt.aspectRatioSuggestion = prompt.aspect_ratio_suggestion;
  }

  if (typeof prompt.art_direction_notes === 'string') {
    prompt.artDirectionNotes = prompt.art_direction_notes;
  }

  return prompt;
}

function normalizeCampaignObject(value: unknown) {
  const unwrapped = unwrapCampaignPayload(value);

  if (!isRecord(unwrapped)) {
    return unwrapped;
  }

  const normalized: LooseRecord = {};

  for (const [key, originalValue] of Object.entries(unwrapped)) {
    const normalizedKey =
      key in fieldAliases
        ? fieldAliases[key as keyof typeof fieldAliases]
        : key;
    const value = maybeParseJsonString(originalValue);

    if (normalizedKey === 'imagePrompts' && Array.isArray(value)) {
      normalized[normalizedKey] = value.map(normalizePromptShape);
      continue;
    }

    normalized[normalizedKey] = value;
  }

  return normalized;
}

function formatFieldName(key: string) {
  switch (key) {
    case 'conceptSummary':
      return 'concept summary';
    case 'audienceInsight':
      return 'audience insight';
    case 'campaignAngles':
      return 'campaign angles';
    case 'imagePrompts':
      return 'image prompts';
    case 'voiceoverScript':
      return 'voiceover script';
    default:
      return key.replace(/([A-Z])/g, ' $1').toLowerCase();
  }
}

function formatValidationIssues(error: z.ZodError) {
  const seen = new Set<string>();

  return error.issues.reduce<string[]>((messages, issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'campaign';
    const message = `${path}: ${issue.message}`;

    if (seen.has(message)) {
      return messages;
    }

    seen.add(message);
    messages.push(message);
    return messages;
  }, []);
}

function summarizeValidationError(error: z.ZodError) {
  const rootFields = Array.from(
    new Set(
      error.issues
        .map((issue) => issue.path[0])
        .filter(
          (field): field is CampaignFieldKey =>
            typeof field === 'string' &&
            campaignFieldKeys.includes(field as CampaignFieldKey),
        ),
    ),
  );

  if (rootFields.length === 0) {
    return 'Pollinations returned campaign JSON, but HiveLaunch could not validate it cleanly.';
  }

  return `Pollinations returned a partial or malformed campaign object. Check ${rootFields
    .map(formatFieldName)
    .join(', ')}.`;
}

function normalizeTextGroup(items: string[]) {
  const normalized = uniqueList(items);

  if (normalized.length < 3) {
    throw new Error('The generated campaign did not include enough unique items.');
  }

  return normalized.slice(0, 3);
}

export function parseCampaignPayload(text: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractBalancedJson(text)) as unknown;
  } catch (error) {
    if (error instanceof CampaignPayloadError) {
      throw error;
    }

    throw new CampaignPayloadError(
      'Pollinations returned JSON that HiveLaunch could not parse.',
      {
        stage: 'response_extraction',
        details: [error instanceof Error ? error.message : 'Unknown JSON parse error.'],
      },
    );
  }

  const normalized = normalizeCampaignObject(parsed);
  const validated = generatedCampaignPayloadSchema.safeParse(normalized);

  if (!validated.success) {
    throw new CampaignPayloadError(summarizeValidationError(validated.error), {
      stage: 'schema_validation',
      details: formatValidationIssues(validated.error),
    });
  }

  const payload = validated.data;

  return {
    ...payload,
    campaignAngles: normalizeTextGroup(payload.campaignAngles),
    headlines: normalizeTextGroup(payload.headlines),
    captions: normalizeTextGroup(payload.captions),
    ctas: normalizeTextGroup(payload.ctas),
    imagePrompts: payload.imagePrompts.slice(0, 3).map((item, index) => ({
      ...item,
      title: item.title.trim(),
      prompt: item.prompt.trim(),
      aspectRatioSuggestion: normalizeAspectRatio(item.aspectRatioSuggestion),
      artDirectionNotes: item.artDirectionNotes?.trim() || undefined,
      id: `${slugify(item.title)}-${index + 1}`,
    })),
    voiceoverScript: payload.voiceoverScript?.trim() || undefined,
  };
}

export function parseSectionPayload<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  text: string,
) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractBalancedJson(text)) as unknown;
  } catch (error) {
    if (error instanceof CampaignPayloadError) {
      throw error;
    }

    throw new CampaignPayloadError(
      'Pollinations returned JSON that HiveLaunch could not parse.',
      {
        stage: 'response_extraction',
        details: [error instanceof Error ? error.message : 'Unknown JSON parse error.'],
      },
    );
  }

  const normalized = normalizeCampaignObject(parsed);
  const validated = schema.safeParse(normalized);

  if (!validated.success) {
    throw new CampaignPayloadError(
      'Pollinations returned section JSON, but HiveLaunch could not validate it cleanly.',
      {
        stage: 'schema_validation',
        details: formatValidationIssues(validated.error),
      },
    );
  }

  return validated.data;
}

export function buildCampaignPlan(
  brief: CampaignBrief,
  payload: ReturnType<typeof parseCampaignPayload>,
  models: {
    textModel: string;
    imageModel: string;
    audioModel?: string;
  },
  rawResponse: string,
): CampaignPlan {
  return {
    appVersion: __APP_VERSION__,
    createdAt: new Date().toISOString(),
    brief,
    conceptSummary: payload.conceptSummary.trim(),
    audienceInsight: payload.audienceInsight.trim(),
    campaignAngles: payload.campaignAngles,
    headlines: payload.headlines,
    captions: payload.captions,
    ctas: payload.ctas,
    imagePrompts: payload.imagePrompts.map((item, index) => ({
      id: `${slugify(brief.productName)}-${index + 1}-${slugify(item.title)}`,
      title: item.title,
      prompt: item.prompt,
      aspectRatioSuggestion:
        item.aspectRatioSuggestion || suggestAspectRatioForPlatform(brief.platform),
      artDirectionNotes: item.artDirectionNotes,
    })),
    voiceoverScript: payload.voiceoverScript,
    modelMetadata: models,
    debug: {
      rawResponsePreview: trimPreview(rawResponse),
    },
  };
}
