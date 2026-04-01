import { describe, expect, it } from 'vitest';

import {
  buildByopAuthorizeUrl,
  detectKeyType,
  looksLikePollinationsKey,
  parseAuthCallbackHash,
} from '@/lib/auth';
import type { StudioSettings } from '@/types/campaign';

const baseSettings: StudioSettings = {
  preferredTextModel: 'openai',
  preferredImageModel: 'flux',
  preferredAudioModel: 'openai-audio',
  preferredVoice: 'nova',
  imageQuality: 'medium',
  safeMode: true,
  privateMode: true,
  enhancePrompts: false,
  rememberManualKey: false,
  byopBudget: '10',
  byopExpiryDays: '7',
  requestedPermissions: ['profile', 'balance', 'usage'],
  restrictToSelectedModels: true,
};

describe('auth helpers', () => {
  it('parses api_key fragments', () => {
    expect(parseAuthCallbackHash('#api_key=sk_test_123')).toEqual({
      apiKey: 'sk_test_123',
      error: undefined,
    });
  });

  it('detects publishable and secret keys', () => {
    expect(detectKeyType('pk_demo_123')).toBe('publishable');
    expect(detectKeyType('sk_demo_123')).toBe('secret');
    expect(detectKeyType('demo_123')).toBe('unknown');
  });

  it('recognizes Pollinations key formats', () => {
    expect(looksLikePollinationsKey('pk_valid_demo_123456789')).toBe(true);
    expect(looksLikePollinationsKey('sk_valid_demo_123456789')).toBe(true);
    expect(looksLikePollinationsKey('hello')).toBe(false);
  });

  it('builds a BYOP URL with restrictions', () => {
    const url = new URL(
      buildByopAuthorizeUrl(baseSettings, ['openai', 'flux', 'openai']),
    );

    expect(url.hostname).toBe('enter.pollinations.ai');
    expect(url.searchParams.get('models')).toBe('openai,flux');
    expect(url.searchParams.get('budget')).toBe('10');
    expect(url.searchParams.get('expiry')).toBe('7');
    expect(url.searchParams.get('permissions')).toBe('profile,balance,usage');
  });
});
