import { startTransition, useEffect, useState } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { BriefForm } from '@/components/BriefForm';
import { CampaignWorkspace } from '@/components/CampaignWorkspace';
import { ExportPanel } from '@/components/ExportPanel';
import { HeroSection } from '@/components/HeroSection';
import { HistoryPanel } from '@/components/HistoryPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import {
  buildByopAuthorizeUrl,
  clearAuthHash,
  looksLikePollinationsKey,
  parseAuthCallbackHash,
} from '@/lib/auth';
import { buildCampaignZip, createCampaignJson, createCampaignMarkdown, downloadTextFile } from '@/lib/export';
import {
  defaultAudioVoice,
  resolveAudioModelPreference,
  resolveVoicePreference,
  toAudioUnavailableReason,
} from '@/lib/audio';
import {
  checkAudioSupport,
  discoverModels,
  generateCampaignKit,
  generateVisualAsset,
  generateVoiceover,
  getGenerationDebugInfo,
  inspectKey,
  regenerateSection,
} from '@/lib/pollinations';
import { defaultSettings, loadSnapshot, saveSnapshot } from '@/lib/storage';
import { createSessionId, downloadBlob, toErrorMessage } from '@/lib/utils';
import type {
  AudioAvailability,
  ApiKeyConnection,
  AspectRatioPreset,
  CampaignPlan,
  CampaignSession,
  KeyInspection,
  ModelCatalog,
  OperationState,
  RegenerableSection,
  StudioSettings,
} from '@/types/campaign';

type BannerState = {
  tone: 'info' | 'success' | 'error';
  message: string;
} | null;

type KeyState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  inspection?: KeyInspection;
  error?: string;
};

function makeSessionName(plan: CampaignPlan) {
  return `${plan.brief.productName} - ${plan.brief.platform}`;
}

function isInvalidPollinationsKeyError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();

  return (
    message.includes('api key required') ||
    message.includes('authentication required') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('invalid key')
  );
}

function createSession(plan: CampaignPlan, settings: StudioSettings): CampaignSession {
  return {
    id: createSessionId(),
    name: makeSessionName(plan),
    plan,
    images: [],
    voiceover: plan.voiceoverScript
      ? {
          script: plan.voiceoverScript,
          model: settings.preferredAudioModel,
          voice: settings.preferredVoice,
          format: 'mp3',
        }
      : undefined,
  };
}

export function App() {
  const [initialSnapshot] = useState(() => loadSnapshot());
  const [settings, setSettings] = useState(initialSnapshot.settings);
  const [briefDraft, setBriefDraft] = useState(initialSnapshot.lastBrief);
  const [sessions, setSessions] = useState(initialSnapshot.sessions);
  const [savedApiKey, setSavedApiKey] = useState<string | undefined>(
    initialSnapshot.savedApiKey,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    initialSnapshot.sessions[0]?.id,
  );
  const [manualKey, setManualKey] = useState('');
  const [pendingImportedKey, setPendingImportedKey] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [generationState, setGenerationState] = useState<OperationState>({
    status: 'idle',
  });
  const [audioState, setAudioState] = useState<OperationState>({ status: 'idle' });
  const [audioAvailability, setAudioAvailability] = useState<AudioAvailability>({
    status: 'idle',
  });
  const [sectionStates, setSectionStates] = useState<
    Partial<Record<RegenerableSection, OperationState>>
  >({});
  const [imageStates, setImageStates] = useState<Record<string, OperationState>>({});
  const [selectedAspectRatios, setSelectedAspectRatios] = useState<
    Record<string, AspectRatioPreset>
  >({});
  const [keyState, setKeyState] = useState<KeyState>({
    status: initialSnapshot.savedApiKey ? 'loading' : 'idle',
  });
  const [modelCatalog, setModelCatalog] = useState<ModelCatalog>({
    textModels: [{ name: initialSnapshot.settings.preferredTextModel }],
    imageModels: [{ name: initialSnapshot.settings.preferredImageModel }],
    audioModels: [{ name: initialSnapshot.settings.preferredAudioModel }],
    source: 'fallback',
  });
  const [connection, setConnection] = useState<ApiKeyConnection | null>(() =>
    initialSnapshot.savedApiKey
      ? {
          apiKey: initialSnapshot.savedApiKey,
          source: 'stored',
          persisted: true,
          connectedAt: new Date().toISOString(),
        }
      : null,
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || null;
  const recipeSignature = activeSession
    ? activeSession.plan.imagePrompts
        .map((recipe) => `${recipe.id}:${recipe.aspectRatioSuggestion}`)
        .join('|')
    : '';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const callback = parseAuthCallbackHash(window.location.hash);

    if (callback.apiKey) {
      setConnection({
        apiKey: callback.apiKey,
        source: 'byop',
        persisted: false,
        connectedAt: new Date().toISOString(),
      });
      setPendingImportedKey(true);
      setBanner({
        tone: 'success',
        message:
          'Connected with Pollinations. Save this key on this device if you want quick reuse.',
      });
      clearAuthHash();
      return;
    }

    if (callback.error) {
      setBanner({ tone: 'error', message: callback.error });
      clearAuthHash();
    }
  }, []);

  useEffect(() => {
    saveSnapshot({
      version: 1,
      savedApiKey,
      settings,
      sessions,
      lastBrief: briefDraft,
    });
  }, [briefDraft, savedApiKey, sessions, settings]);

  useEffect(() => {
    let ignore = false;

    async function hydrateConnection() {
      if (!connection?.apiKey) {
        setKeyState({ status: 'idle' });
        setModelCatalog(await discoverModels(undefined));
        return;
      }

      setKeyState({ status: 'loading' });

      const [inspectionResult, catalogResult] = await Promise.allSettled([
        inspectKey(connection.apiKey),
        discoverModels(connection.apiKey),
      ]);

      if (ignore) {
        return;
      }

      if (catalogResult.status === 'fulfilled') {
        setModelCatalog(catalogResult.value);
      } else {
        setModelCatalog(await discoverModels(undefined));
      }

      if (inspectionResult.status === 'fulfilled') {
        setKeyState({ status: 'ready', inspection: inspectionResult.value });
      } else {
        const errorMessage = toErrorMessage(inspectionResult.reason);

        if (isInvalidPollinationsKeyError(inspectionResult.reason)) {
          setConnection(null);

          if (connection.persisted) {
            setSavedApiKey(undefined);
          }

          setBanner({
            tone: 'error',
            message: connection.persisted
              ? 'The saved Pollinations key is no longer valid and was removed. Connect again with a current key.'
              : 'That Pollinations key is no longer valid. Connect again with a current key.',
          });
          return;
        }

        setKeyState({
          status: 'error',
          error: errorMessage,
        });
      }
    }

    void hydrateConnection();

    return () => {
      ignore = true;
    };
  }, [connection?.apiKey, connection?.persisted]);

  useEffect(() => {
    setSettings((current) => {
      const nextTextModel =
        modelCatalog.textModels.find(
          (model) => model.name === current.preferredTextModel,
        )?.name || modelCatalog.textModels[0]?.name || defaultSettings.preferredTextModel;
      const nextImageModel =
        modelCatalog.imageModels.find(
          (model) => model.name === current.preferredImageModel,
        )?.name || modelCatalog.imageModels[0]?.name || defaultSettings.preferredImageModel;
      const nextAudioModel = resolveAudioModelPreference(
        modelCatalog.audioModels,
        current.preferredAudioModel,
        defaultSettings.preferredAudioModel,
      );
      const selectedAudioModel = modelCatalog.audioModels.find(
        (model) => model.name === nextAudioModel,
      );
      const nextVoice = resolveVoicePreference(
        selectedAudioModel,
        current.preferredVoice || defaultAudioVoice,
      );

      if (
        nextTextModel === current.preferredTextModel &&
        nextImageModel === current.preferredImageModel &&
        nextAudioModel === current.preferredAudioModel &&
        nextVoice === current.preferredVoice
      ) {
        return current;
      }

      return {
        ...current,
        preferredTextModel: nextTextModel,
        preferredImageModel: nextImageModel,
        preferredAudioModel: nextAudioModel,
        preferredVoice: nextVoice,
      };
    });
  }, [modelCatalog.audioModels, modelCatalog.imageModels, modelCatalog.textModels]);

  useEffect(() => {
    let ignore = false;

    async function verifyAudioSupport() {
      if (!connection?.apiKey || !activeSession?.plan.voiceoverScript) {
        setAudioAvailability({ status: 'idle' });
        return;
      }

      if (modelCatalog.audioModels.length === 0) {
        setAudioAvailability({
          status: 'unavailable',
          reason:
            'Pollinations did not expose any text-to-audio models for this runtime.',
        });
        return;
      }

      const selectedAudioModel = modelCatalog.audioModels.find(
        (model) => model.name === settings.preferredAudioModel,
      );

      if (!selectedAudioModel) {
        setAudioAvailability({
          status: 'unavailable',
          reason:
            'The selected audio model is not a supported Pollinations TTS model.',
        });
        return;
      }

      setAudioAvailability({ status: 'checking' });
      const availability = await checkAudioSupport({
        apiKey: connection.apiKey,
        audioModel: selectedAudioModel.name,
        voice: settings.preferredVoice,
      });

      if (!ignore) {
        setAudioAvailability(availability);
      }
    }

    void verifyAudioSupport();

    return () => {
      ignore = true;
    };
  }, [
    activeSession?.id,
    activeSession?.plan.voiceoverScript,
    connection?.apiKey,
    modelCatalog.audioModels,
    settings.preferredAudioModel,
    settings.preferredVoice,
  ]);

  useEffect(() => {
    if (!activeSession) {
      setSelectedAspectRatios({});
      return;
    }

    setSelectedAspectRatios((current) => {
      const next = { ...current };

      for (const recipe of activeSession.plan.imagePrompts) {
        if (!next[recipe.id]) {
          next[recipe.id] = recipe.aspectRatioSuggestion;
        }
      }

      return next;
    });
  }, [activeSession, activeSession?.id, recipeSignature]);

  function updateSettings(updates: Partial<StudioSettings>) {
    setSettings((current) => ({
      ...current,
      ...updates,
    }));
  }

  function applySession(nextSession: CampaignSession) {
    startTransition(() => {
      setSessions((current) => {
        const deduped = current.filter((session) => session.id !== nextSession.id);
        return [nextSession, ...deduped].slice(0, 12);
      });
      setActiveSessionId(nextSession.id);
    });
  }

  function updateCurrentSession(transform: (session: CampaignSession) => CampaignSession) {
    if (!activeSession) {
      return;
    }

    applySession(transform(activeSession));
  }

  function connectWithKey(apiKey: string, source: ApiKeyConnection['source'], persisted: boolean) {
    setConnection({
      apiKey,
      source,
      persisted,
      connectedAt: new Date().toISOString(),
    });
    setSavedApiKey(persisted ? apiKey : undefined);
  }

  function handleManualConnect() {
    const apiKey = manualKey.trim();

    if (!looksLikePollinationsKey(apiKey)) {
      setBanner({
        tone: 'error',
        message:
          'That key does not look like a Pollinations pk_ or sk_ value yet.',
      });
      return;
    }

    connectWithKey(apiKey, 'manual', settings.rememberManualKey);
    setPendingImportedKey(false);
    setManualKey('');
    setBanner({
      tone: 'success',
      message: settings.rememberManualKey
        ? 'Pollinations key connected and saved locally.'
        : 'Pollinations key connected for this session only.',
    });
  }

  function handleDisconnect() {
    setConnection(null);
    setSavedApiKey(undefined);
    setPendingImportedKey(false);
    setKeyState({ status: 'idle' });
    setBanner({ tone: 'info', message: 'Pollinations key disconnected.' });
  }

  function handleForgetSavedKey() {
    setSavedApiKey(undefined);
    setConnection((current) =>
      current ? { ...current, persisted: false } : current,
    );
    setBanner({
      tone: 'info',
      message: 'Saved key removed from local storage.',
    });
  }

  function handleOpenSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    setActiveSessionId(sessionId);
    setBriefDraft(session.plan.brief);
  }

  function handleDeleteSession(sessionId: string) {
    setSessions((current) => {
      const nextSessions = current.filter((session) => session.id !== sessionId);

      if (activeSessionId === sessionId) {
        const nextActive = nextSessions[0];
        setActiveSessionId(nextActive?.id);
        if (nextActive) {
          setBriefDraft(nextActive.plan.brief);
        }
      }

      return nextSessions;
    });
  }

  async function handleGenerateCampaign(brief: CampaignPlan['brief']) {
    setBriefDraft(brief);

    if (!connection?.apiKey) {
      setBanner({
        tone: 'error',
        message: 'Connect a Pollinations key before generating a campaign kit.',
      });
      return;
    }

    setGenerationState({ status: 'loading' });

    try {
      const plan = await generateCampaignKit({
        apiKey: connection.apiKey,
        brief,
        textModel: settings.preferredTextModel,
        imageModel: settings.preferredImageModel,
        audioModel: settings.preferredAudioModel,
      });

      const session = createSession(plan, settings);
      applySession(session);
      setGenerationState({ status: 'idle' });
      setBanner({
        tone: 'success',
        message: 'Campaign kit generated with Pollinations.',
      });
    } catch (error) {
      setGenerationState({
        status: 'error',
        error: toErrorMessage(error),
        debug: getGenerationDebugInfo(error),
      });
    }
  }

  async function handleRegenerateSection(section: RegenerableSection) {
    if (!activeSession || !connection?.apiKey) {
      return;
    }

    setSectionStates((current) => ({
      ...current,
      [section]: { status: 'loading' },
    }));

    try {
      const partial = await regenerateSection({
        apiKey: connection.apiKey,
        brief: activeSession.plan.brief,
        plan: activeSession.plan,
        section,
        textModel: settings.preferredTextModel,
      });

      updateCurrentSession((session) => {
        const nextPlan = {
          ...session.plan,
          ...partial,
        };

        return {
          ...session,
          plan: nextPlan,
          images:
            section === 'imagePrompts'
              ? []
              : session.images,
          voiceover:
            section === 'voiceoverScript'
              ? {
                  script:
                    (partial as { voiceoverScript: string }).voiceoverScript,
                  model: settings.preferredAudioModel,
                  voice: settings.preferredVoice,
                  format: 'mp3',
                }
              : session.voiceover,
        };
      });

      setSectionStates((current) => ({
        ...current,
        [section]: { status: 'idle' },
      }));
    } catch (error) {
      setSectionStates((current) => ({
        ...current,
        [section]: {
          status: 'error',
          error: toErrorMessage(error),
        },
      }));
    }
  }

  async function handleGenerateImage(recipeId: string) {
    if (!activeSession || !connection?.apiKey) {
      return;
    }

    const recipe = activeSession.plan.imagePrompts.find((item) => item.id === recipeId);

    if (!recipe) {
      return;
    }

    setImageStates((current) => ({
      ...current,
      [recipeId]: { status: 'loading' },
    }));

    try {
      const asset = await generateVisualAsset({
        apiKey: connection.apiKey,
        recipe,
        imageModel: settings.preferredImageModel,
        imageQuality: settings.imageQuality,
        aspectRatio: selectedAspectRatios[recipeId] || recipe.aspectRatioSuggestion,
        safeMode: settings.safeMode,
        privateMode: settings.privateMode,
        enhancePrompts: settings.enhancePrompts,
      });

      updateCurrentSession((session) => ({
        ...session,
        images: [
          asset,
          ...session.images.filter((image) => image.recipeId !== recipeId),
        ],
      }));

      setImageStates((current) => ({
        ...current,
        [recipeId]: { status: 'idle' },
      }));
    } catch (error) {
      setImageStates((current) => ({
        ...current,
        [recipeId]: {
          status: 'error',
          error: toErrorMessage(error),
        },
      }));
    }
  }

  async function handleGenerateAudio() {
    if (!activeSession || !connection?.apiKey) {
      return;
    }

    const script = activeSession.voiceover?.script || activeSession.plan.voiceoverScript;

    if (!script) {
      setBanner({
        tone: 'error',
        message: 'Generate or refresh the voiceover script before requesting audio.',
      });
      return;
    }

    if (audioAvailability.status === 'checking') {
      setBanner({
        tone: 'info',
        message: 'Checking whether Pollinations TTS is available for this key and model.',
      });
      return;
    }

    if (audioAvailability.status === 'unavailable') {
      setAudioState({
        status: 'error',
        error: audioAvailability.reason,
      });
      return;
    }

    setAudioState({ status: 'loading' });

    try {
      const voiceover = await generateVoiceover({
        apiKey: connection.apiKey,
        script,
        audioModel: settings.preferredAudioModel,
        voice: settings.preferredVoice,
      });

      updateCurrentSession((session) => ({
        ...session,
        voiceover,
      }));
      setAudioState({ status: 'idle' });
      setAudioAvailability({ status: 'available' });
    } catch (error) {
      const reason = toAudioUnavailableReason(error, settings.preferredAudioModel);
      setAudioAvailability({
        status: 'unavailable',
        reason,
      });
      setAudioState({
        status: 'error',
        error: reason,
      });
    }
  }

  function handleExportMarkdown() {
    if (!activeSession) {
      return;
    }

    downloadTextFile(
      `${activeSession.plan.brief.productName.toLowerCase().replace(/\s+/g, '-')}-campaign-kit.md`,
      createCampaignMarkdown(activeSession),
      'text/markdown;charset=utf-8',
    );
  }

  function handleExportJson() {
    if (!activeSession) {
      return;
    }

    downloadTextFile(
      `${activeSession.plan.brief.productName.toLowerCase().replace(/\s+/g, '-')}-campaign-kit.json`,
      createCampaignJson(activeSession),
      'application/json;charset=utf-8',
    );
  }

  async function handleExportZip() {
    if (!activeSession) {
      return;
    }

    setZipBusy(true);

    try {
      const blob = await buildCampaignZip(activeSession);
      downloadBlob(
        blob,
        `${activeSession.plan.brief.productName
          .toLowerCase()
          .replace(/\s+/g, '-')}-campaign-kit.zip`,
      );
    } catch (error) {
      setBanner({
        tone: 'error',
        message: toErrorMessage(error),
      });
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-transparent text-[#e7f4eb]">
        <HeroSection
          hasKey={Boolean(connection)}
          onConnect={() => {
            window.location.href = buildByopAuthorizeUrl(settings, [
              settings.preferredTextModel,
              settings.preferredImageModel,
            ]);
          }}
        />

        <main
          id="studio"
          className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10"
        >
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SettingsPanel
              connection={connection}
              savedApiKey={savedApiKey}
              manualKey={manualKey}
              pendingImportedKey={pendingImportedKey}
              keyState={keyState}
              modelCatalog={modelCatalog}
              settings={settings}
              onManualKeyChange={setManualKey}
              onConnectManual={handleManualConnect}
              onConnectByop={(url) => {
                window.location.href = url;
              }}
              onDisconnect={handleDisconnect}
              onForgetSavedKey={handleForgetSavedKey}
              onSaveImportedKey={() => {
                if (!connection?.apiKey) {
                  return;
                }

                setSavedApiKey(connection.apiKey);
                setConnection({
                  ...connection,
                  persisted: true,
                });
                setPendingImportedKey(false);
              }}
              onDismissImportedKey={() => setPendingImportedKey(false)}
              onSettingsChange={updateSettings}
            />
            <HistoryPanel
              sessions={sessions}
              activeSessionId={activeSessionId}
              onOpen={handleOpenSession}
              onDelete={handleDeleteSession}
            />
            <ExportPanel
              session={activeSession}
              zipBusy={zipBusy}
              onExportMarkdown={handleExportMarkdown}
              onExportJson={handleExportJson}
              onExportZip={handleExportZip}
            />
          </aside>

          <div className="space-y-6">
            {banner ? (
              <div
                className={`rounded-[1.5rem] border p-4 text-sm ${
                  banner.tone === 'error'
                    ? 'border-[#ff9789]/30 bg-[#ff9789]/8 text-[#ffd4cd]'
                    : banner.tone === 'success'
                      ? 'border-[#8ff3c2]/25 bg-[#8ff3c2]/8 text-[#dff8ea]'
                      : 'border-white/10 bg-white/5 text-[#dbe7de]'
                }`}
              >
                {banner.message}
              </div>
            ) : null}

            <BriefForm
              initialBrief={briefDraft}
              isSubmitting={generationState.status === 'loading'}
              hasApiKey={Boolean(connection?.apiKey)}
              onDraftChange={setBriefDraft}
              onSubmit={handleGenerateCampaign}
            />

            <CampaignWorkspace
              session={activeSession}
              hasApiKey={Boolean(connection?.apiKey)}
              generationState={generationState}
              sectionStates={sectionStates}
              imageStates={imageStates}
              selectedAspectRatios={selectedAspectRatios}
              audioState={audioState}
              audioAvailability={audioAvailability}
              onRegenerateSection={handleRegenerateSection}
              onSelectAspectRatio={(recipeId, preset) =>
                setSelectedAspectRatios((current) => ({
                  ...current,
                  [recipeId]: preset,
                }))
              }
              onGenerateImage={handleGenerateImage}
              onGenerateAudio={handleGenerateAudio}
            />
          </div>
        </main>

        <footer className="border-t border-white/6 px-6 py-8 text-sm text-[#8ca296] sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              HiveLaunch is a BYOP campaign studio powered by{' '}
              <a
                href="https://pollinations.ai"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#d7f171]"
              >
                Pollinations.ai
              </a>
              .
            </div>
            <div>Version {__APP_VERSION__}</div>
          </div>
        </footer>
      </div>
    </AppErrorBoundary>
  );
}
