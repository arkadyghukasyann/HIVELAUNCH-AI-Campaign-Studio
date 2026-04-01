export type AccountPermission = 'profile' | 'balance' | 'usage';
export type AudioVoice = string;
export type AudioFormat = 'wav' | 'mp3' | 'flac' | 'opus' | 'pcm16';
export type ImageQuality = 'low' | 'medium' | 'high' | 'hd';

export interface KeyInfo {
  valid: boolean;
  type: string;
  name?: string;
  expiresAt?: string;
  expiresIn?: number;
  permissions?: {
    models?: string[];
    account?: string[];
  };
  pollenBudget?: number;
  rateLimitEnabled?: boolean;
}

export interface ModelInfo {
  name: string;
  description?: string;
  aliases?: string[];
  voices?: string[];
  tier?: string;
  community?: boolean;
  input_modalities?: string[];
  output_modalities?: string[];
  tools?: boolean;
  vision?: boolean;
  audio?: boolean;
  reasoning?: boolean;
  uncensored?: boolean;
}

export type AspectRatioPreset = '1:1' | '4:5' | '16:9' | '9:16';

export interface CampaignBrief {
  productName: string;
  description: string;
  audience: string;
  platform: string;
  tone: string;
  visualStyle: string;
  brandColors: string;
  language: string;
  offer: string;
  notes: string;
}

export interface ImagePromptRecipe {
  id: string;
  title: string;
  prompt: string;
  aspectRatioSuggestion: AspectRatioPreset;
  artDirectionNotes?: string;
}

export interface CampaignPlan {
  appVersion: string;
  createdAt: string;
  brief: CampaignBrief;
  conceptSummary: string;
  audienceInsight: string;
  campaignAngles: string[];
  headlines: string[];
  captions: string[];
  ctas: string[];
  imagePrompts: ImagePromptRecipe[];
  voiceoverScript?: string;
  modelMetadata: {
    textModel: string;
    imageModel: string;
    audioModel?: string;
  };
  debug: {
    rawResponsePreview?: string;
    parsingNotes?: string[];
  };
}

export type GenerationFailurePhase =
  | 'request'
  | 'response_extraction'
  | 'schema_validation'
  | 'fallback';

export interface GenerationDebugAttempt {
  label: string;
  model?: string;
  error?: string;
  rawResponsePreview?: string;
}

export interface GenerationDebugInfo {
  phase: GenerationFailurePhase;
  notes: string[];
  rawResponsePreview?: string;
  attempts?: GenerationDebugAttempt[];
}

export interface GeneratedImageAsset {
  id: string;
  recipeId: string;
  title: string;
  prompt: string;
  aspectRatio: AspectRatioPreset;
  model: string;
  url: string;
  seed: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface VoiceoverAsset {
  script: string;
  model: string;
  voice: AudioVoice;
  format: AudioFormat;
  audioDataUrl?: string;
  generatedAt?: string;
}

export interface CampaignSession {
  id: string;
  name: string;
  plan: CampaignPlan;
  images: GeneratedImageAsset[];
  voiceover?: VoiceoverAsset;
}

export interface ApiKeyConnection {
  apiKey: string;
  source: 'manual' | 'byop' | 'stored';
  persisted: boolean;
  connectedAt: string;
}

export interface KeyInspection {
  keyInfo?: KeyInfo;
  profileName?: string;
  accountTier?: string;
  balance?: number;
  warnings: string[];
}

export interface ModelCatalog {
  textModels: ModelInfo[];
  imageModels: ModelInfo[];
  audioModels: ModelInfo[];
  source: 'live' | 'fallback';
  lastUpdatedAt?: string;
  error?: string;
}

export interface AudioAvailability {
  status: 'idle' | 'checking' | 'available' | 'unavailable';
  reason?: string;
}

export interface StudioSettings {
  preferredTextModel: string;
  preferredImageModel: string;
  preferredAudioModel: string;
  preferredVoice: AudioVoice;
  imageQuality: ImageQuality;
  safeMode: boolean;
  privateMode: boolean;
  enhancePrompts: boolean;
  rememberManualKey: boolean;
  byopBudget: string;
  byopExpiryDays: string;
  requestedPermissions: AccountPermission[];
  restrictToSelectedModels: boolean;
}

export interface AppStorageSnapshot {
  version: number;
  savedApiKey?: string;
  settings: StudioSettings;
  sessions: CampaignSession[];
  lastBrief: CampaignBrief;
}

export interface OperationState {
  status: 'idle' | 'loading' | 'error';
  error?: string;
  debug?: GenerationDebugInfo;
}

export type RegenerableSection =
  | 'campaignAngles'
  | 'headlines'
  | 'captions'
  | 'ctas'
  | 'imagePrompts'
  | 'voiceoverScript';
