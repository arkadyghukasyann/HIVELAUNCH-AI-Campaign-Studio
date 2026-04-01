import {
  AlertCircle,
  Copy,
  Download,
  ImageIcon,
  Mic2,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';

import { downloadImageAsset } from '@/lib/export';
import { copyText, formatTimestamp } from '@/lib/utils';
import type {
  AudioAvailability,
  AspectRatioPreset,
  CampaignSession,
  OperationState,
  RegenerableSection,
} from '@/types/campaign';

interface CampaignWorkspaceProps {
  session: CampaignSession | null;
  hasApiKey: boolean;
  generationState: OperationState;
  sectionStates: Partial<Record<RegenerableSection, OperationState>>;
  imageStates: Record<string, OperationState>;
  selectedAspectRatios: Record<string, AspectRatioPreset>;
  audioState: OperationState;
  audioAvailability: AudioAvailability;
  onRegenerateSection: (section: RegenerableSection) => Promise<void>;
  onSelectAspectRatio: (recipeId: string, preset: AspectRatioPreset) => void;
  onGenerateImage: (recipeId: string) => Promise<void>;
  onGenerateAudio: () => Promise<void>;
}

function ActionButton(props: {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => {
        void props.onClick();
      }}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white transition hover:border-[#d7f171]/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.icon}
      {props.label}
    </button>
  );
}

function SectionTitle(props: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
          {props.eyebrow}
        </div>
        <h3 className="font-display text-2xl font-semibold text-white">
          {props.title}
        </h3>
        {props.body ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8ca296]">
            {props.body}
          </p>
        ) : null}
      </div>
      {props.action}
    </div>
  );
}

function GenerationDebugPanel(props: { state: OperationState }) {
  if (props.state.status !== 'error' || !props.state.debug) {
    return null;
  }

  return (
    <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#c8d7ce]">
      <summary className="cursor-pointer list-none font-semibold text-[#d7f171]">
        Debug details
      </summary>
      <div className="mt-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[#8ff3c2]">
            Failure phase
          </div>
          <div className="mt-2 text-white">{props.state.debug.phase}</div>
        </div>

        {props.state.debug.notes.length > 0 ? (
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[#8ff3c2]">
              Notes
            </div>
            <div className="mt-2 space-y-2">
              {props.state.debug.notes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl border border-white/8 bg-white/5 p-3"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {props.state.debug.attempts?.length ? (
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[#8ff3c2]">
              Attempts
            </div>
            <div className="mt-2 space-y-3">
              {props.state.debug.attempts.map((attempt) => (
                <div
                  key={`${attempt.label}-${attempt.error || 'ok'}`}
                  className="rounded-2xl border border-white/8 bg-white/5 p-3"
                >
                  <div className="font-semibold text-white">{attempt.label}</div>
                  {attempt.model ? (
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[#8ca296]">
                      Model: {attempt.model}
                    </div>
                  ) : null}
                  {attempt.error ? (
                    <p className="mt-2 text-[#ffd4cd]">{attempt.error}</p>
                  ) : null}
                  {attempt.rawResponsePreview ? (
                    <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/8 bg-black/30 p-3 text-xs leading-6 text-[#dbe7de]">
                      <code>{attempt.rawResponsePreview}</code>
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {props.state.debug.rawResponsePreview ? (
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[#8ff3c2]">
              Raw response preview
            </div>
            <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/8 bg-black/30 p-3 text-xs leading-6 text-[#dbe7de]">
              <code>{props.state.debug.rawResponsePreview}</code>
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function CampaignWorkspace({
  session,
  hasApiKey,
  generationState,
  sectionStates,
  imageStates,
  selectedAspectRatios,
  audioState,
  audioAvailability,
  onRegenerateSection,
  onSelectAspectRatio,
  onGenerateImage,
  onGenerateAudio,
}: CampaignWorkspaceProps) {
  if (!session) {
    return (
      <section className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-8">
        <SectionTitle
          eyebrow="Campaign Workspace"
          title="Your launch kit will appear here"
          body={
            hasApiKey
              ? 'Complete the brief and generate a campaign kit to unlock copy, prompts, visuals, and exports.'
              : 'Connect Pollinations first, then submit the brief to generate a real campaign kit.'
          }
        />
        {generationState.status === 'error' ? (
          <>
            <div className="rounded-2xl border border-[#ff9789]/30 bg-[#ff9789]/8 p-4 text-sm text-[#ffd4cd]">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold text-white">
                    HiveLaunch could not finish the campaign run.
                  </div>
                  <p className="mt-2">{generationState.error}</p>
                </div>
              </div>
            </div>
            <GenerationDebugPanel state={generationState} />
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-8 text-sm leading-7 text-[#8ca296]">
            HiveLaunch will show a structured concept summary, campaign angles,
            headlines, captions, CTAs, image prompt recipes, generated visuals,
            and an optional voiceover script here once the first kit is ready.
          </div>
        )}
      </section>
    );
  }

  const imageByRecipeId = Object.fromEntries(
    session.images.map((asset) => [asset.recipeId, asset]),
  );

  return (
    <section className="grid gap-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-8">
        <SectionTitle
          eyebrow="Campaign Workspace"
          title={session.plan.brief.productName}
          body={`Generated ${formatTimestamp(session.plan.createdAt)} · ${session.plan.modelMetadata.textModel} / ${session.plan.modelMetadata.imageModel}`}
        />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.6rem] border border-[#d7f171]/15 bg-[rgba(215,241,113,0.08)] p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
              Concept summary
            </div>
            <p className="mt-3 text-lg leading-8 text-white">
              {session.plan.conceptSummary}
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-white/8 bg-black/15 p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8ff3c2]">
              Audience insight
            </div>
            <p className="mt-3 text-sm leading-7 text-[#c8d7ce]">
              {session.plan.audienceInsight}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-8">
        <SectionTitle
          eyebrow="Messaging"
          title="Angles, headlines, captions, and CTAs"
          body="Refresh only the section you want to improve while keeping the rest of the kit intact."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          {[
            {
              key: 'campaignAngles',
              title: 'Campaign angles',
              items: session.plan.campaignAngles,
            },
            {
              key: 'headlines',
              title: 'Headline options',
              items: session.plan.headlines,
            },
            {
              key: 'captions',
              title: 'Caption options',
              items: session.plan.captions,
            },
            {
              key: 'ctas',
              title: 'CTA options',
              items: session.plan.ctas,
            },
          ].map((section) => {
            const sectionKey = section.key as RegenerableSection;
            const sectionState = sectionStates[sectionKey];

            return (
              <div
                key={section.key}
                className="rounded-[1.6rem] border border-white/8 bg-black/15 p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h4 className="font-display text-xl font-semibold text-white">
                    {section.title}
                  </h4>
                  <ActionButton
                    label={
                      sectionState?.status === 'loading'
                        ? 'Refreshing...'
                        : 'Refresh'
                    }
                    icon={<RefreshCcw className="h-4 w-4" />}
                    disabled={sectionState?.status === 'loading'}
                    onClick={() => onRegenerateSection(sectionKey)}
                  />
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/6 bg-black/10 p-4"
                    >
                      <p className="text-sm leading-7 text-[#dbe7de]">{item}</p>
                      <div className="mt-3">
                        <ActionButton
                          label="Copy"
                          icon={<Copy className="h-4 w-4" />}
                          onClick={() => copyText(item)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-8">
        <SectionTitle
          eyebrow="Visual recipes"
          title="Prompt cards with real Pollinations generation"
          body="Each prompt can be generated, regenerated, copied, and downloaded with a channel-appropriate aspect ratio."
          action={
            <ActionButton
              label={
                sectionStates.imagePrompts?.status === 'loading'
                  ? 'Refreshing prompts...'
                  : 'Refresh all prompts'
              }
              icon={<RefreshCcw className="h-4 w-4" />}
              disabled={sectionStates.imagePrompts?.status === 'loading'}
              onClick={() => onRegenerateSection('imagePrompts')}
            />
          }
        />

        <div className="grid gap-4 xl:grid-cols-3">
          {session.plan.imagePrompts.map((recipe) => {
            const image = imageByRecipeId[recipe.id] as
              | CampaignSession['images'][number]
              | undefined;
            const imageState = imageStates[recipe.id];
            const selectedAspect = selectedAspectRatios[recipe.id] || recipe.aspectRatioSuggestion;

            return (
              <div
                key={recipe.id}
                className="rounded-[1.8rem] border border-white/8 bg-black/15 p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[#8ff3c2]">
                      {recipe.aspectRatioSuggestion}
                    </div>
                    <h4 className="font-display text-2xl font-semibold text-white">
                      {recipe.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(recipe.prompt)}
                    className="rounded-full border border-white/10 bg-white/6 p-2 text-white"
                    aria-label={`Copy prompt for ${recipe.title}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm leading-7 text-[#c8d7ce]">{recipe.prompt}</p>
                {recipe.artDirectionNotes ? (
                  <p className="mt-3 text-sm text-[#8ca296]">
                    Art direction: {recipe.artDirectionNotes}
                  </p>
                ) : null}

                <label className="mt-4 grid gap-2">
                  <span className="text-sm font-semibold text-[#c8d7ce]">
                    Aspect ratio preset
                  </span>
                  <select
                    value={selectedAspect}
                    onChange={(event) =>
                      onSelectAspectRatio(
                        recipe.id,
                        event.target.value as AspectRatioPreset,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  >
                    {(['1:1', '4:5', '16:9', '9:16'] as const).map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    label={
                      imageState?.status === 'loading'
                        ? 'Generating...'
                        : image
                          ? 'Regenerate image'
                          : 'Generate image'
                    }
                    icon={<Sparkles className="h-4 w-4" />}
                    disabled={imageState?.status === 'loading'}
                    onClick={() => onGenerateImage(recipe.id)}
                  />
                  {image ? (
                    <ActionButton
                      label="Download"
                      icon={<Download className="h-4 w-4" />}
                      onClick={() => downloadImageAsset(image)}
                    />
                  ) : null}
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/8 bg-black/20">
                  {image ? (
                    <img
                      src={image.url}
                      alt={recipe.title}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-[#6f8577]">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <ImageIcon className="h-10 w-10 text-[#4a5c50]" />
                        No generated visual yet
                      </div>
                    </div>
                  )}
                </div>

                {imageState?.status === 'error' ? (
                  <div className="mt-3 rounded-2xl border border-[#ff9789]/30 bg-[#ff9789]/8 p-3 text-sm text-[#ffd4cd]">
                    {imageState.error}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-8">
        <SectionTitle
          eyebrow="Asset gallery"
          title="Generated visuals"
          body="Generated visuals are stored with the local session so you can reopen and export later."
        />

        {session.images.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {session.images.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-[1.6rem] border border-white/8 bg-black/15"
              >
                <img
                  src={asset.url}
                  alt={asset.title}
                  className="h-56 w-full object-cover"
                />
                <div className="space-y-3 p-4">
                  <div>
                    <div className="font-semibold text-white">{asset.title}</div>
                    <div className="text-sm text-[#8ca296]">
                      {asset.aspectRatio} · seed {asset.seed}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      label="Copy prompt"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => copyText(asset.prompt)}
                    />
                    <ActionButton
                      label="Download"
                      icon={<Download className="h-4 w-4" />}
                      onClick={() => downloadImageAsset(asset)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-6 text-sm leading-7 text-[#8ca296]">
            Generate the first visual from any prompt card to start building the
            campaign gallery.
          </div>
        )}
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-8">
        <SectionTitle
          eyebrow="Voiceover"
          title="Script and optional TTS"
          body="Pollinations can turn the generated voiceover script into a playable MP3 when you want audio coverage."
          action={
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label={
                  sectionStates.voiceoverScript?.status === 'loading'
                    ? 'Refreshing script...'
                    : 'Refresh script'
                }
                icon={<RefreshCcw className="h-4 w-4" />}
                disabled={sectionStates.voiceoverScript?.status === 'loading'}
                onClick={() => onRegenerateSection('voiceoverScript')}
              />
              <ActionButton
                label={
                  audioAvailability.status === 'checking'
                    ? 'Checking audio...'
                    : audioAvailability.status === 'unavailable'
                      ? 'Audio unavailable'
                      : audioState.status === 'loading'
                        ? 'Generating audio...'
                        : 'Generate audio'
                }
                icon={<Mic2 className="h-4 w-4" />}
                disabled={
                  audioState.status === 'loading' ||
                  audioAvailability.status === 'checking' ||
                  audioAvailability.status === 'unavailable'
                }
                onClick={onGenerateAudio}
              />
            </div>
          }
        />

        <div className="rounded-[1.5rem] border border-white/8 bg-black/15 p-5">
          <p className="text-sm leading-7 text-[#dbe7de]">
            {session.voiceover?.script || session.plan.voiceoverScript || 'No voiceover script generated yet.'}
          </p>
          {session.voiceover?.audioDataUrl ? (
            <audio
              controls
              className="mt-4 w-full"
              src={session.voiceover.audioDataUrl}
            />
          ) : null}
          {audioAvailability.status === 'unavailable' ? (
            <div className="mt-3 rounded-2xl border border-[#f7cf79]/20 bg-[#f7cf79]/8 p-3 text-sm text-[#f9e8b7]">
              {audioAvailability.reason}
            </div>
          ) : null}
          {audioState.status === 'error' ? (
            <div className="mt-3 rounded-2xl border border-[#ff9789]/30 bg-[#ff9789]/8 p-3 text-sm text-[#ffd4cd]">
              {audioState.error}
            </div>
          ) : null}
        </div>
      </div>

      <details className="glass-panel rounded-[1.6rem] border border-white/10 bg-[rgba(10,20,15,0.78)] p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[#d7f171]">
          Debug drawer and raw model preview
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4 text-sm text-[#c8d7ce]">
            <div className="font-semibold text-white">Model metadata</div>
            <div className="mt-3 space-y-2">
              <div>Text model: {session.plan.modelMetadata.textModel}</div>
              <div>Image model: {session.plan.modelMetadata.imageModel}</div>
              <div>
                Audio model: {session.plan.modelMetadata.audioModel || 'Not set'}
              </div>
              {session.plan.debug.parsingNotes?.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl border border-[#f7cf79]/20 bg-[#f7cf79]/8 p-3 text-[#f9e8b7]"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-white">
              <AlertCircle className="h-4 w-4 text-[#8ff3c2]" />
              Raw response preview
            </div>
            <pre className="max-h-[22rem] overflow-auto whitespace-pre-wrap text-xs leading-6 text-[#8ca296]">
              {session.plan.debug.rawResponsePreview || 'No raw preview captured.'}
            </pre>
          </div>
        </div>
      </details>
    </section>
  );
}
