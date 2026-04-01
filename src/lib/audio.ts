import { toErrorMessage } from '@/lib/utils';
import type { ModelInfo } from '@/types/campaign';

export const defaultAudioModel = 'elevenlabs';
export const defaultAudioVoice = 'nova';

export function isTextToAudioModel(model: ModelInfo) {
  const inputs = model.input_modalities || [];
  const outputs = model.output_modalities || [];

  return inputs.includes('text') && outputs.includes('audio');
}

export function filterTextToAudioModels(models: ModelInfo[]) {
  return models.filter(isTextToAudioModel);
}

export function resolveAudioModelPreference(
  models: ModelInfo[],
  preferred: string,
  fallback = defaultAudioModel,
) {
  if (models.length === 0) {
    return fallback;
  }

  const normalizedPreferred = preferred.trim().toLowerCase();
  const directMatch = models.find(
    (model) => model.name.trim().toLowerCase() === normalizedPreferred,
  );

  if (directMatch) {
    return directMatch.name;
  }

  const aliasMatch = models.find((model) =>
    model.aliases?.some((alias) => alias.trim().toLowerCase() === normalizedPreferred),
  );

  if (aliasMatch) {
    return aliasMatch.name;
  }

  return models[0]?.name || fallback;
}

export function resolveVoicePreference(model: ModelInfo | undefined, preferred: string) {
  const voices = model?.voices || [];

  if (voices.length === 0) {
    return preferred.trim() || defaultAudioVoice;
  }

  const normalizedPreferred = preferred.trim().toLowerCase();
  const directMatch = voices.find(
    (voice) => voice.trim().toLowerCase() === normalizedPreferred,
  );

  return directMatch || voices[0] || defaultAudioVoice;
}

export function toAudioUnavailableReason(error: unknown, model?: string) {
  const message = toErrorMessage(error);

  if (
    message.includes('Invalid service or alias') ||
    message.includes('Model not found')
  ) {
    return `Pollinations TTS does not support "${model || 'the selected audio model'}". HiveLaunch will keep the voiceover script, but audio is disabled until you choose a supported TTS model.`;
  }

  if (message.includes('Authentication required')) {
    return 'Pollinations TTS is unavailable for the current key or runtime right now. HiveLaunch kept the voiceover script, but disabled audio generation to avoid a broken action.';
  }

  if (message.includes('timed out')) {
    return 'Pollinations TTS is taking too long for the current runtime. HiveLaunch kept the voiceover script, but disabled audio generation until the audio endpoint responds reliably.';
  }

  return `Pollinations TTS is unavailable right now: ${message}`;
}
