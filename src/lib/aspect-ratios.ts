import type { AspectRatioPreset } from '@/types/campaign';

export const aspectRatioOptions = [
  {
    key: '1:1',
    label: '1:1 post',
    description: 'Square social post',
    width: 1024,
    height: 1024,
  },
  {
    key: '4:5',
    label: '4:5 portrait ad',
    description: 'Instagram feed portrait',
    width: 1024,
    height: 1280,
  },
  {
    key: '16:9',
    label: '16:9 hero banner',
    description: 'Website hero or video cover',
    width: 1365,
    height: 768,
  },
  {
    key: '9:16',
    label: '9:16 story cover',
    description: 'Story, Reel, or TikTok cover',
    width: 1024,
    height: 1820,
  },
] as const satisfies Array<{
  key: AspectRatioPreset;
  label: string;
  description: string;
  width: number;
  height: number;
}>;

export function getAspectRatioOption(preset: AspectRatioPreset) {
  return (
    aspectRatioOptions.find((option) => option.key === preset) ??
    aspectRatioOptions[0]
  );
}

export function normalizeAspectRatio(value?: string): AspectRatioPreset {
  if (!value) {
    return '1:1';
  }

  if (value.includes('9:16')) {
    return '9:16';
  }

  if (value.includes('16:9')) {
    return '16:9';
  }

  if (value.includes('4:5')) {
    return '4:5';
  }

  return '1:1';
}

export function suggestAspectRatioForPlatform(platform: string): AspectRatioPreset {
  const normalized = platform.toLowerCase();

  if (
    normalized.includes('story') ||
    normalized.includes('reel') ||
    normalized.includes('tiktok')
  ) {
    return '9:16';
  }

  if (normalized.includes('hero') || normalized.includes('website')) {
    return '16:9';
  }

  if (normalized.includes('instagram') || normalized.includes('feed')) {
    return '4:5';
  }

  return '1:1';
}

export function createSeed() {
  return Math.floor(Math.random() * 900_000_000) + 100_000_000;
}
