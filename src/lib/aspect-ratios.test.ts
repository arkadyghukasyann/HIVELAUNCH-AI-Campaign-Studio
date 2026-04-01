import { describe, expect, it } from 'vitest';

import {
  createSeed,
  normalizeAspectRatio,
  suggestAspectRatioForPlatform,
} from '@/lib/aspect-ratios';

describe('aspect ratio helpers', () => {
  it('normalizes suggestions to supported presets', () => {
    expect(normalizeAspectRatio('story 9:16')).toBe('9:16');
    expect(normalizeAspectRatio('hero 16:9')).toBe('16:9');
    expect(normalizeAspectRatio('feed 4:5')).toBe('4:5');
    expect(normalizeAspectRatio('unknown')).toBe('1:1');
  });

  it('suggests aspect ratios from platform names', () => {
    expect(suggestAspectRatioForPlatform('TikTok teaser')).toBe('9:16');
    expect(suggestAspectRatioForPlatform('Website hero')).toBe('16:9');
    expect(suggestAspectRatioForPlatform('Instagram feed')).toBe('4:5');
  });

  it('creates random integer seeds', () => {
    const seed = createSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThan(0);
  });
});
