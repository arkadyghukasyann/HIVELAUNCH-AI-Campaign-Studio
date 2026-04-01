import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';

import { buildByopAuthorizeUrl, detectKeyType, looksLikePollinationsKey } from '@/lib/auth';
import type {
  ApiKeyConnection,
  KeyInspection,
  ModelCatalog,
  StudioSettings,
} from '@/types/campaign';

interface SettingsPanelProps {
  connection: ApiKeyConnection | null;
  savedApiKey?: string;
  manualKey: string;
  pendingImportedKey: boolean;
  keyState: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    inspection?: KeyInspection;
    error?: string;
  };
  modelCatalog: ModelCatalog;
  settings: StudioSettings;
  onManualKeyChange: (value: string) => void;
  onConnectManual: () => void;
  onConnectByop: (url: string) => void;
  onDisconnect: () => void;
  onForgetSavedKey: () => void;
  onSaveImportedKey: () => void;
  onDismissImportedKey: () => void;
  onSettingsChange: (updates: Partial<StudioSettings>) => void;
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ name: string; description?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#c8d7ce]">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
      >
        {props.options.map((option) => (
          <option key={option.name} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsPanel({
  connection,
  savedApiKey,
  manualKey,
  pendingImportedKey,
  keyState,
  modelCatalog,
  settings,
  onManualKeyChange,
  onConnectManual,
  onConnectByop,
  onDisconnect,
  onForgetSavedKey,
  onSaveImportedKey,
  onDismissImportedKey,
  onSettingsChange,
}: SettingsPanelProps) {
  const manualKeyLooksValid = looksLikePollinationsKey(manualKey);
  const manualKeyType = detectKeyType(manualKey);
  const byopUrl = buildByopAuthorizeUrl(settings, [
    settings.preferredTextModel,
    settings.preferredImageModel,
  ]);
  const selectedAudioModel = modelCatalog.audioModels.find(
    (model) => model.name === settings.preferredAudioModel,
  );

  return (
    <section className="glass-panel rounded-[1.9rem] border border-white/10 bg-[rgba(11,22,16,0.84)] p-5">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
          API + Models
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">
          Connect Pollinations
        </h2>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-[#9bb5a4]">
        <div className="mb-3 flex items-center gap-2 text-white">
          <ShieldCheck className="h-4 w-4 text-[#d7f171]" />
          Key status
        </div>
        {connection ? (
          <div className="space-y-2">
            <div className="font-semibold text-white">
              Connected via {connection.source === 'byop' ? 'BYOP' : 'manual key'}
            </div>
            <div>
              {keyState.status === 'loading'
                ? 'Checking key permissions and account metadata...'
                : keyState.status === 'error'
                  ? keyState.error
                  : keyState.inspection?.profileName
                    ? `${keyState.inspection.profileName} · ${keyState.inspection.accountTier || 'account'}`
                    : keyState.inspection?.keyInfo?.type
                      ? `${keyState.inspection.keyInfo.type} key connected`
                      : 'Connected'}
            </div>
            {keyState.inspection?.balance !== undefined ? (
              <div>Balance: {keyState.inspection.balance} pollen</div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={onDisconnect}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white transition hover:border-[#d7f171]/30"
              >
                Disconnect
              </button>
              {savedApiKey ? (
                <button
                  type="button"
                  onClick={onForgetSavedKey}
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[#ff9789] transition hover:border-[#ff9789]/40"
                >
                  Forget saved key
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            No Pollinations key connected yet. Use manual key mode for direct
            testing or launch the official BYOP redirect flow.
          </div>
        )}
      </div>

      {pendingImportedKey ? (
        <div className="mt-4 rounded-2xl border border-[#d7f171]/20 bg-[#d7f171]/8 p-4 text-sm text-[#dce8d0]">
          <div className="font-semibold text-white">
            Pollinations key received from the redirect flow
          </div>
          <p className="mt-1 text-[#b8c7bd]">
            Save it on this device for future sessions, or keep it temporary for
            the current browser tab only.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSaveImportedKey}
              className="rounded-full bg-[#d7f171] px-4 py-2 font-semibold text-[#08110d]"
            >
              Save on this device
            </button>
            <button
              type="button"
              onClick={onDismissImportedKey}
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white"
            >
              Keep temporary
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex items-center gap-2 text-white">
          <KeyRound className="h-4 w-4 text-[#8ff3c2]" />
          Manual key mode
        </div>
        <input
          value={manualKey}
          onChange={(event) => onManualKeyChange(event.target.value)}
          placeholder="pk_... or sk_..."
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-[#6f8577]"
        />
        <div className="mt-2 text-xs text-[#8ca296]">
          {manualKey
            ? manualKeyLooksValid
              ? manualKeyType === 'publishable'
                ? 'Publishable key detected. It works, but expect rate limits.'
                : 'Secret key detected. Never commit it or share it publicly.'
              : 'Key format does not match the expected Pollinations pk_ or sk_ pattern yet.'
            : 'Paste a Pollinations API key. HiveLaunch stores it locally only if you confirm that choice.'}
        </div>
        <label className="mt-3 flex items-center gap-3 text-sm text-[#c8d7ce]">
          <input
            type="checkbox"
            checked={settings.rememberManualKey}
            onChange={(event) =>
              onSettingsChange({ rememberManualKey: event.target.checked })
            }
            className="h-4 w-4 rounded border-white/15 bg-black/20"
          />
          Remember this key on this device
        </label>
        <button
          type="button"
          disabled={!manualKeyLooksValid}
          onClick={onConnectManual}
          className="mt-4 rounded-full bg-[#8ff3c2] px-5 py-2.5 font-semibold text-[#08110d] transition disabled:cursor-not-allowed disabled:bg-[#43614f]"
        >
          Use this key
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-white">BYOP connect mode</div>
          <button
            type="button"
            onClick={() => onConnectByop(byopUrl)}
            className="rounded-full border border-[#d7f171]/30 bg-[#d7f171]/10 px-4 py-2 text-sm font-semibold text-[#d7f171]"
          >
            Connect with Pollinations
          </button>
        </div>
        <p className="text-sm leading-6 text-[#8ca296]">
          The authorize flow returns a temporary key in the URL fragment, which
          HiveLaunch reads client-side and removes from browser history.
        </p>
        <a
          href="https://pollinations.ai"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm text-[#8ff3c2] hover:text-white"
        >
          Pollinations credit and docs
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
          Model discovery
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-[#8ca296]">
          {modelCatalog.source === 'live'
            ? `Live model catalog fetched from Pollinations at ${modelCatalog.lastUpdatedAt ? new Date(modelCatalog.lastUpdatedAt).toLocaleTimeString() : 'just now'}.`
            : `Using fallback defaults because live discovery is unavailable${modelCatalog.error ? `: ${modelCatalog.error}` : '.'}`}
        </div>
        <SelectField
          label="Text model"
          value={settings.preferredTextModel}
          options={modelCatalog.textModels}
          onChange={(value) => onSettingsChange({ preferredTextModel: value })}
        />
        <SelectField
          label="Image model"
          value={settings.preferredImageModel}
          options={modelCatalog.imageModels}
          onChange={(value) => onSettingsChange({ preferredImageModel: value })}
        />
        <SelectField
          label="Audio model"
          value={settings.preferredAudioModel}
          options={modelCatalog.audioModels}
          onChange={(value) => onSettingsChange({ preferredAudioModel: value })}
        />
        {selectedAudioModel?.voices?.length ? (
          <SelectField
            label="Voice"
            value={settings.preferredVoice}
            options={selectedAudioModel.voices.map((voice) => ({ name: voice }))}
            onChange={(value) =>
              onSettingsChange({
                preferredVoice: value,
              })
            }
          />
        ) : (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#c8d7ce]">Voice</span>
            <input
              value={settings.preferredVoice}
              onChange={(event) =>
                onSettingsChange({
                  preferredVoice: event.target.value,
                })
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-[#c8d7ce]">
        <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
          Generation controls
        </div>
        <label className="flex items-center justify-between gap-3">
          Safe mode
          <input
            type="checkbox"
            checked={settings.safeMode}
            onChange={(event) => onSettingsChange({ safeMode: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          Private generation
          <input
            type="checkbox"
            checked={settings.privateMode}
            onChange={(event) => onSettingsChange({ privateMode: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          Prompt enhancement
          <input
            type="checkbox"
            checked={settings.enhancePrompts}
            onChange={(event) =>
              onSettingsChange({ enhancePrompts: event.target.checked })
            }
          />
        </label>
        <label className="grid gap-2">
          <span>Image quality</span>
          <select
            value={settings.imageQuality}
            onChange={(event) =>
              onSettingsChange({
                imageQuality: event.target.value as StudioSettings['imageQuality'],
              })
            }
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
          >
            {['low', 'medium', 'high', 'hd'].map((quality) => (
              <option key={quality} value={quality}>
                {quality}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-[#c8d7ce]">
        <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
          BYOP request options
        </div>
        <label className="flex items-center justify-between gap-3">
          Restrict to selected models
          <input
            type="checkbox"
            checked={settings.restrictToSelectedModels}
            onChange={(event) =>
              onSettingsChange({ restrictToSelectedModels: event.target.checked })
            }
          />
        </label>
        <label className="grid gap-2">
          <span>Budget cap (optional)</span>
          <input
            value={settings.byopBudget}
            onChange={(event) => onSettingsChange({ byopBudget: event.target.value })}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            placeholder="10"
          />
        </label>
        <label className="grid gap-2">
          <span>Expiry in days</span>
          <input
            value={settings.byopExpiryDays}
            onChange={(event) =>
              onSettingsChange({ byopExpiryDays: event.target.value })
            }
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            placeholder="7"
          />
        </label>
      </div>
    </section>
  );
}
