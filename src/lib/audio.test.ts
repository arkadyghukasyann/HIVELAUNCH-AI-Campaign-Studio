import { describe, expect, it } from 'vitest';

import {
  filterTextToAudioModels,
  resolveAudioModelPreference,
  resolveVoicePreference,
  toAudioUnavailableReason,
} from '@/lib/audio';
import type { ModelInfo } from '@/types/campaign';

const models: ModelInfo[] = [
  {
    name: 'elevenlabs',
    aliases: ['tts', 'tts-1'],
    voices: ['alloy', 'nova', 'shimmer'],
    input_modalities: ['text'],
    output_modalities: ['audio'],
  },
  {
    name: 'scribe',
    aliases: ['scribe_v2', 'scribe-v2'],
    input_modalities: ['audio'],
    output_modalities: ['text'],
  },
];

describe('audio helpers', () => {
  it('keeps only text-to-audio models', () => {
    expect(filterTextToAudioModels(models)).toEqual([models[0]]);
  });

  it('falls back from unsupported aliases to a valid audio model', () => {
    expect(
      resolveAudioModelPreference(models, 'ElevenLabs Scribe v2', 'elevenlabs'),
    ).toBe('elevenlabs');
    expect(resolveAudioModelPreference(models, 'tts-1', 'elevenlabs')).toBe(
      'elevenlabs',
    );
  });

  it('resolves voices to a supported option', () => {
    expect(resolveVoicePreference(models[0], 'nova')).toBe('nova');
    expect(resolveVoicePreference(models[0], 'ghost')).toBe('alloy');
  });

  it('maps invalid alias and auth failures to user-friendly audio messages', () => {
    expect(
      toAudioUnavailableReason(
        new Error('Invalid service or alias: "ElevenLabs Scribe v2".'),
        'ElevenLabs Scribe v2',
      ),
    ).toContain('does not support');

    expect(
      toAudioUnavailableReason(
        new Error('Authentication required. Please provide an API key.'),
        'elevenlabs',
      ),
    ).toContain('disabled audio generation');
  });
});
