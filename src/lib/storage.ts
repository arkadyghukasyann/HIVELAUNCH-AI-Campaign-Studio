import { defaultAudioModel, defaultAudioVoice } from '@/lib/audio';
import { appEnv } from '@/lib/env';
import { emptyBrief } from '@/schema/campaign';
import type {
  AppStorageSnapshot,
  CampaignBrief,
  CampaignSession,
  StudioSettings,
} from '@/types/campaign';

const storageKey = 'hivelaunch:studio:v1';
const storageVersion = 1;

export const defaultSettings: StudioSettings = {
  preferredTextModel: appEnv.defaultTextModel,
  preferredImageModel: appEnv.defaultImageModel,
  preferredAudioModel: defaultAudioModel,
  preferredVoice: defaultAudioVoice,
  imageQuality: 'medium',
  safeMode: true,
  privateMode: true,
  enhancePrompts: false,
  rememberManualKey: false,
  byopBudget: '',
  byopExpiryDays: '7',
  requestedPermissions: ['profile', 'balance', 'usage'],
  restrictToSelectedModels: true,
};

function getStorage() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}

function normalizeBrief(value: unknown): CampaignBrief {
  if (!value || typeof value !== 'object') {
    return emptyBrief;
  }

  const record = value as Record<string, unknown>;

  return {
    productName: typeof record.productName === 'string' ? record.productName : '',
    description: typeof record.description === 'string' ? record.description : '',
    audience: typeof record.audience === 'string' ? record.audience : '',
    platform:
      typeof record.platform === 'string' && record.platform
        ? record.platform
        : emptyBrief.platform,
    tone:
      typeof record.tone === 'string' && record.tone ? record.tone : emptyBrief.tone,
    visualStyle:
      typeof record.visualStyle === 'string' && record.visualStyle
        ? record.visualStyle
        : emptyBrief.visualStyle,
    brandColors:
      typeof record.brandColors === 'string' ? record.brandColors : '',
    language:
      typeof record.language === 'string' && record.language
        ? record.language
        : emptyBrief.language,
    offer: typeof record.offer === 'string' ? record.offer : '',
    notes: typeof record.notes === 'string' ? record.notes : '',
  };
}

function normalizeSettings(value: unknown): StudioSettings {
  if (!value || typeof value !== 'object') {
    return defaultSettings;
  }

  const record = value as Record<string, unknown>;
  const permissions = Array.isArray(record.requestedPermissions)
    ? record.requestedPermissions.filter(
        (item): item is StudioSettings['requestedPermissions'][number] =>
          item === 'profile' || item === 'balance' || item === 'usage',
      )
    : defaultSettings.requestedPermissions;

  return {
    preferredTextModel:
      typeof record.preferredTextModel === 'string' && record.preferredTextModel
        ? record.preferredTextModel
        : defaultSettings.preferredTextModel,
    preferredImageModel:
      typeof record.preferredImageModel === 'string' && record.preferredImageModel
        ? record.preferredImageModel
        : defaultSettings.preferredImageModel,
    preferredAudioModel:
      typeof record.preferredAudioModel === 'string' && record.preferredAudioModel
        ? record.preferredAudioModel
        : defaultSettings.preferredAudioModel,
    preferredVoice:
      typeof record.preferredVoice === 'string' && record.preferredVoice
        ? record.preferredVoice
        : defaultSettings.preferredVoice,
    imageQuality:
      record.imageQuality === 'low' ||
      record.imageQuality === 'medium' ||
      record.imageQuality === 'high' ||
      record.imageQuality === 'hd'
        ? record.imageQuality
        : defaultSettings.imageQuality,
    safeMode:
      typeof record.safeMode === 'boolean'
        ? record.safeMode
        : defaultSettings.safeMode,
    privateMode:
      typeof record.privateMode === 'boolean'
        ? record.privateMode
        : defaultSettings.privateMode,
    enhancePrompts:
      typeof record.enhancePrompts === 'boolean'
        ? record.enhancePrompts
        : defaultSettings.enhancePrompts,
    rememberManualKey:
      typeof record.rememberManualKey === 'boolean'
        ? record.rememberManualKey
        : defaultSettings.rememberManualKey,
    byopBudget:
      typeof record.byopBudget === 'string'
        ? record.byopBudget
        : defaultSettings.byopBudget,
    byopExpiryDays:
      typeof record.byopExpiryDays === 'string'
        ? record.byopExpiryDays
        : defaultSettings.byopExpiryDays,
    requestedPermissions:
      permissions.length > 0 ? permissions : defaultSettings.requestedPermissions,
    restrictToSelectedModels:
      typeof record.restrictToSelectedModels === 'boolean'
        ? record.restrictToSelectedModels
        : defaultSettings.restrictToSelectedModels,
  };
}

function normalizeSessions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as CampaignSession[];
  }

  return value.filter(
    (entry): entry is CampaignSession =>
      !!entry &&
      typeof entry === 'object' &&
      'id' in entry &&
      'plan' in entry &&
      'images' in entry,
  );
}

export function loadSnapshot(): AppStorageSnapshot {
  const storage = getStorage();
  const fallback: AppStorageSnapshot = {
    version: storageVersion,
    settings: defaultSettings,
    sessions: [],
    lastBrief: emptyBrief,
  };

  if (!storage) {
    return fallback;
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppStorageSnapshot>;

    return {
      version: storageVersion,
      savedApiKey:
        typeof parsed.savedApiKey === 'string' ? parsed.savedApiKey : undefined,
      settings: normalizeSettings(parsed.settings),
      sessions: normalizeSessions(parsed.sessions),
      lastBrief: normalizeBrief(parsed.lastBrief),
    };
  } catch {
    return fallback;
  }
}

export function saveSnapshot(snapshot: AppStorageSnapshot) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(storageKey, JSON.stringify(snapshot));
}
