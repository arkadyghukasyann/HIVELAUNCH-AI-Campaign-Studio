import { describe, expect, it } from 'vitest';

import {
  createCampaignJson,
  createCampaignMarkdown,
  getExportBaseName,
} from '@/lib/export';
import type { CampaignSession } from '@/types/campaign';

const session: CampaignSession = {
  id: 'session-1',
  name: 'Hive tea launch',
  plan: {
    appVersion: '0.1.0',
    createdAt: '2026-04-01T12:00:00.000Z',
    brief: {
      productName: 'Hive Tea',
      description: 'A botanical sparkling tea for creative afternoons.',
      audience: 'Design-forward wellness shoppers',
      platform: 'Instagram campaign',
      tone: 'Bright and stylish',
      visualStyle: 'Editorial still life',
      brandColors: 'sage, cream, amber',
      language: 'English',
      offer: '15% off first order',
      notes: 'Focus on afternoon rituals',
    },
    conceptSummary: 'A fresh afternoon ritual anchored in calm energy.',
    audienceInsight:
      'The audience wants wellness products that still feel tastefully designed.',
    campaignAngles: ['Desk ritual', 'Natural energy', 'Stylish reset'],
    headlines: [
      'Sip your second wind',
      'Botanical calm, bottled',
      'Reset the afternoon',
    ],
    captions: [
      'A bright caption',
      'Another bright caption',
      'Final bright caption',
    ],
    ctas: ['Shop the drop', 'Claim the launch offer', 'Build your ritual'],
    imagePrompts: [
      {
        id: 'prompt-1',
        title: 'Hero can',
        prompt: 'Editorial photo of a sparkling tea can on travertine.',
        aspectRatioSuggestion: '4:5',
        artDirectionNotes: 'Soft noon light.',
      },
      {
        id: 'prompt-2',
        title: 'Desk ritual',
        prompt: 'Lifestyle photo of a designer reaching for sparkling tea.',
        aspectRatioSuggestion: '1:1',
      },
      {
        id: 'prompt-3',
        title: 'Mood scene',
        prompt: 'Still life with tea can, sketchbook, and lemons.',
        aspectRatioSuggestion: '16:9',
      },
    ],
    voiceoverScript:
      'Meet the tea that resets your afternoon in one bright sip.',
    modelMetadata: {
      textModel: 'openai',
      imageModel: 'flux',
      audioModel: 'openai-audio',
    },
    debug: {
      rawResponsePreview: '{"conceptSummary":"preview"}',
    },
  },
  images: [],
  voiceover: {
    script: 'Meet the tea that resets your afternoon in one bright sip.',
    model: 'openai-audio',
    voice: 'nova',
    format: 'mp3',
  },
};

describe('export helpers', () => {
  it('creates a readable markdown brief', () => {
    const markdown = createCampaignMarkdown(session);

    expect(markdown).toContain('# Hive Tea Campaign Kit');
    expect(markdown).toContain('## Image Prompt Recipes');
    expect(markdown).toContain('Built with pollinations.ai');
  });

  it('creates a stable json export', () => {
    const json = createCampaignJson(session);
    expect(JSON.parse(json)).toHaveProperty('plan.brief.productName', 'Hive Tea');
  });

  it('creates a slugged export base name', () => {
    expect(getExportBaseName(session)).toBe('hive-tea-campaign-kit');
  });
});
