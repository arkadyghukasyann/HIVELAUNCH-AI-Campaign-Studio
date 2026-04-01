import { describe, expect, it } from 'vitest';

import {
  CampaignPayloadError,
  buildCampaignPlan,
  parseCampaignPayload,
} from '@/schema/campaign';
import type { CampaignBrief } from '@/types/campaign';

const brief: CampaignBrief = {
  productName: 'Solar Notes',
  description: 'An ambient productivity app for deep work sessions.',
  audience: 'Remote creatives who want better focus rituals',
  platform: 'Website hero campaign',
  tone: 'Calm and premium',
  visualStyle: 'Minimal editorial gradients',
  brandColors: 'moss, parchment, midnight',
  language: 'English',
  offer: 'Free 14-day reset plan',
  notes: 'Keep language grounded and useful',
};

describe('campaign schema helpers', () => {
  it('extracts and normalizes a JSON campaign payload', () => {
    const payload = parseCampaignPayload(`
      Here is the plan:
      \`\`\`json
      {
        "conceptSummary": "Solar Notes reframes focus as a ritual, not a grind.",
        "audienceInsight": "Remote creatives want tools that feel restorative instead of clinical.",
        "campaignAngles": ["Focus ritual", "Soft productivity", "Creative recovery"],
        "headlines": ["Focus without the friction", "Ambient structure for your best work", "A calmer way to enter deep work"],
        "captions": [
          "Turn your work block into a ritual that feels restorative and useful.",
          "Solar Notes gives remote creatives a softer runway into focused sessions.",
          "If productivity tools feel sharp-edged, this is your gentler reset."
        ],
        "ctas": ["Start the reset", "Try the focus ritual", "Claim your 14-day plan"],
        "imagePrompts": [
          {
            "title": "Desk sunrise",
            "prompt": "Editorial workspace lit by a warm sunrise, laptop open to a calming ambient app.",
            "aspectRatioSuggestion": "16:9",
            "artDirectionNotes": "Use atmospheric light and negative space."
          },
          {
            "title": "Focus ritual",
            "prompt": "Minimal still life with notebook, headphones, tea, and a calm ambient glow.",
            "aspectRatioSuggestion": "4:5"
          },
          {
            "title": "Night reset",
            "prompt": "Dark-mode app dashboard in a quiet home studio at blue hour.",
            "aspectRatioSuggestion": "1:1"
          }
        ],
        "voiceoverScript": "Meet the focus app that helps you settle in before you dive deep."
      }
      \`\`\`
    `);

    expect(payload.headlines).toHaveLength(3);
    expect(payload.imagePrompts[0]?.aspectRatioSuggestion).toBe('16:9');
  });

  it('recovers the live response shape with longer aspect ratio labels', () => {
    const payload = parseCampaignPayload(`
      {
        "conceptSummary": "GlowJar turns a candle drop into a collectible ritual for design-led homes.",
        "audienceInsight": "Home fragrance buyers want a product shot that feels editorial, giftable, and easy to post.",
        "campaignAngles": [
          "Collector-worthy seasonal drop",
          "Design object for the coffee table",
          "Giftable sensory reset"
        ],
        "headlines": [
          "The candle drop that looks styled before you light it",
          "A seasonal scent designed for the shelf and the story",
          "Bring home a candle that photographs like decor"
        ],
        "captions": [
          "GlowJar makes the launch post feel like a design spread with a fragrance payoff.",
          "Style it on the shelf, light it at dusk, and let the whole room feel curated.",
          "A candle drop built for gifting, collecting, and posting in the same week."
        ],
        "ctas": [
          "Shop the limited drop",
          "Claim your first scent",
          "Style your shelf for spring"
        ],
        "imagePrompts": [
          {
            "title": "Editorial shelf hero",
            "prompt": "Editorial still life of a sculptural candle on brushed stone with warm botanical highlights and premium packaging detail.",
            "aspectRatioSuggestion": "4:5 (portrait for Instagram feed)",
            "artDirectionNotes": "Keep the shadows soft and the label tack sharp."
          },
          {
            "title": "Coffee table ritual",
            "prompt": "Lifestyle interior scene with a candle beside art books, linen textures, and a late afternoon glow.",
            "aspectRatioSuggestion": "1:1 (square for carousel or single post)"
          },
          {
            "title": "Launch banner scene",
            "prompt": "Wide hero composition of multiple candle variants with layered props and premium botanical texture.",
            "aspectRatioSuggestion": "16:9 (hero banner for landing page)"
          }
        ],
        "voiceoverScript": "Meet the candle drop that styles your room before you even strike the match."
      }
    `);

    expect(payload.imagePrompts[0]?.aspectRatioSuggestion).toBe('4:5');
    expect(payload.imagePrompts[1]?.aspectRatioSuggestion).toBe('1:1');
    expect(payload.imagePrompts[2]?.aspectRatioSuggestion).toBe('16:9');
  });

  it('unwraps common wrapper objects before validation', () => {
    const payload = parseCampaignPayload(`
      {
        "campaignPlan": {
          "concept_summary": "GlowJar turns a candle drop into a collectible ritual for design-led homes.",
          "audience_insight": "Home fragrance buyers want a product shot that feels editorial, giftable, and easy to post.",
          "campaign_angles": [
            "Collector-worthy seasonal drop",
            "Design object for the coffee table",
            "Giftable sensory reset"
          ],
          "headlines": [
            "The candle drop that looks styled before you light it",
            "A seasonal scent designed for the shelf and the story",
            "Bring home a candle that photographs like decor"
          ],
          "captions": [
            "GlowJar makes the launch post feel like a design spread with a fragrance payoff.",
            "Style it on the shelf, light it at dusk, and let the whole room feel curated.",
            "A candle drop built for gifting, collecting, and posting in the same week."
          ],
          "ctas": [
            "Shop the limited drop",
            "Claim your first scent",
            "Style your shelf for spring"
          ],
          "image_prompts": [
            {
              "title": "Editorial shelf hero",
              "prompt": "Editorial still life of a sculptural candle on brushed stone with warm botanical highlights and premium packaging detail.",
              "aspect_ratio_suggestion": "4:5 (portrait for Instagram feed)"
            },
            {
              "title": "Coffee table ritual",
              "prompt": "Lifestyle interior scene with a candle beside art books, linen textures, and a late afternoon glow.",
              "aspect_ratio_suggestion": "1:1"
            },
            {
              "title": "Launch banner scene",
              "prompt": "Wide hero composition of multiple candle variants with layered props and premium botanical texture.",
              "aspect_ratio_suggestion": "16:9"
            }
          ],
          "voiceover_script": "Meet the candle drop that styles your room before you even strike the match."
        }
      }
    `);

    expect(payload.conceptSummary).toContain('GlowJar');
    expect(payload.imagePrompts).toHaveLength(3);
  });

  it('throws a friendly validation error instead of raw zod issues', () => {
    try {
      parseCampaignPayload(`
        {
          "headlines": ["Only one usable headline", "Second option", "Third option"]
        }
      `);
      throw new Error('Expected parseCampaignPayload to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignPayloadError);
      expect((error as CampaignPayloadError).message).toContain(
        'partial or malformed campaign object',
      );
      expect((error as CampaignPayloadError).details?.join('\n')).toContain(
        'conceptSummary',
      );
    }
  });

  it('builds a final CampaignPlan with metadata', () => {
    const payload = parseCampaignPayload(`
      {
        "conceptSummary": "Solar Notes reframes focus as a ritual, not a grind.",
        "audienceInsight": "Remote creatives want tools that feel restorative instead of clinical.",
        "campaignAngles": ["Focus ritual", "Soft productivity", "Creative recovery"],
        "headlines": ["Focus without the friction", "Ambient structure for your best work", "A calmer way to enter deep work"],
        "captions": [
          "Turn your work block into a ritual that feels restorative and useful.",
          "Solar Notes gives remote creatives a softer runway into focused sessions.",
          "If productivity tools feel sharp-edged, this is your gentler reset."
        ],
        "ctas": ["Start the reset", "Try the focus ritual", "Claim your 14-day plan"],
        "imagePrompts": [
          {
            "title": "Desk sunrise",
            "prompt": "Editorial workspace lit by a warm sunrise, laptop open to a calming ambient app.",
            "aspectRatioSuggestion": "16:9"
          },
          {
            "title": "Focus ritual",
            "prompt": "Minimal still life with notebook, headphones, tea, and a calm ambient glow.",
            "aspectRatioSuggestion": "4:5"
          },
          {
            "title": "Night reset",
            "prompt": "Dark-mode app dashboard in a quiet home studio at blue hour.",
            "aspectRatioSuggestion": "1:1"
          }
        ]
      }
    `);

    const plan = buildCampaignPlan(
      brief,
      payload,
      {
        textModel: 'openai',
        imageModel: 'flux',
      },
      '{"conceptSummary":"preview"}',
    );

    expect(plan.brief.productName).toBe('Solar Notes');
    expect(plan.imagePrompts).toHaveLength(3);
    expect(plan.debug.rawResponsePreview).toContain('conceptSummary');
  });
});
