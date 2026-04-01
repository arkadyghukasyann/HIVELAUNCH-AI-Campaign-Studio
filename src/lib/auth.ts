import { appEnv, resolvePublicAppUrl } from '@/lib/env';
import type { StudioSettings } from '@/types/campaign';

const keyPattern = /^(pk|sk)_[A-Za-z0-9_-]{10,}$/;

export function looksLikePollinationsKey(value: string) {
  return keyPattern.test(value.trim());
}

export function detectKeyType(value: string) {
  if (value.startsWith('pk_')) {
    return 'publishable';
  }

  if (value.startsWith('sk_')) {
    return 'secret';
  }

  return 'unknown';
}

export function parseAuthCallbackHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  return {
    apiKey: params.get('api_key')?.trim() || undefined,
    error:
      params.get('error_description')?.trim() ||
      params.get('error')?.trim() ||
      undefined,
  };
}

export function clearAuthHash() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState({}, document.title, url.toString());
}

export function buildByopAuthorizeUrl(
  settings: StudioSettings,
  selectedModels: string[],
) {
  const parsedBudget = settings.byopBudget.trim()
    ? Number(settings.byopBudget)
    : undefined;
  const parsedExpiry = settings.byopExpiryDays.trim()
    ? Number(settings.byopExpiryDays)
    : undefined;
  const uniqueModels = Array.from(
    new Set(selectedModels.map((model) => model.trim()).filter(Boolean)),
  );
  const params = new URLSearchParams({
    redirect_url: resolvePublicAppUrl(),
  });

  if (appEnv.pollinationsAppKey) {
    params.set('app_key', appEnv.pollinationsAppKey);
  }

  if (settings.restrictToSelectedModels && uniqueModels.length > 0) {
    params.set('models', uniqueModels.join(','));
  }

  if (Number.isFinite(parsedBudget)) {
    params.set('budget', String(parsedBudget));
  }

  if (Number.isFinite(parsedExpiry)) {
    params.set('expiry', String(parsedExpiry));
  }

  if (settings.requestedPermissions.length > 0) {
    params.set('permissions', settings.requestedPermissions.join(','));
  }

  return `https://enter.pollinations.ai/authorize?${params.toString()}`;
}
