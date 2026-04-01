import { useEffect, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { input as ZodInput } from 'zod';

import { cn } from '@/lib/utils';
import { briefSchema } from '@/schema/campaign';
import type { CampaignBrief } from '@/types/campaign';

interface BriefFormProps {
  initialBrief: CampaignBrief;
  isSubmitting: boolean;
  hasApiKey: boolean;
  onDraftChange: (brief: CampaignBrief) => void;
  onSubmit: (brief: CampaignBrief) => Promise<void>;
}

type BriefFormValues = ZodInput<typeof briefSchema>;

function FieldShell(props: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-2', props.className)}>
      <span className="text-sm font-semibold text-[#c8d7ce]">{props.label}</span>
      {props.children}
      <span className="min-h-5 text-xs text-[#8ca296]">
        {props.error || props.hint || ''}
      </span>
    </label>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f8577] focus:border-[#d7f171]/40 focus:bg-black/30';

export function BriefForm({
  initialBrief,
  isSubmitting,
  hasApiKey,
  onDraftChange,
  onSubmit,
}: BriefFormProps) {
  const form = useForm<BriefFormValues>({
    resolver: zodResolver(briefSchema),
    defaultValues: initialBrief,
  });

  useEffect(() => {
    form.reset(initialBrief);
  }, [form, initialBrief]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const merged = {
        ...initialBrief,
        ...value,
      };
      const parsed = briefSchema.safeParse(merged);

      onDraftChange(parsed.success ? parsed.data : (merged as CampaignBrief));
    });

    return () => subscription.unsubscribe();
  }, [form, initialBrief, onDraftChange]);

  return (
    <section className="glass-panel rounded-[2rem] border border-white/10 bg-[rgba(10,20,15,0.82)] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-[#d7f171]">
            Brief Builder
          </div>
          <h2 className="font-display text-3xl font-semibold text-white">
            Define the launch in one pass
          </h2>
        </div>
        <div className="max-w-sm text-sm leading-6 text-[#8ca296]">
          HiveLaunch is intentionally narrow: one brief in, one campaign kit out.
        </div>
      </div>

      <form
        className="grid gap-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(briefSchema.parse(values));
        })}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <FieldShell
            label="Product or service name"
            error={form.formState.errors.productName?.message}
          >
            <input
              className={inputClassName}
              placeholder="HiveLaunch, Solar Notes, Studio Roast"
              {...form.register('productName')}
            />
          </FieldShell>
          <FieldShell
            label="Platform goal"
            error={form.formState.errors.platform?.message}
          >
            <input
              className={inputClassName}
              placeholder="Instagram launch post, Website hero, TikTok teaser"
              {...form.register('platform')}
            />
          </FieldShell>
        </div>

        <FieldShell
          label="What are you selling?"
          error={form.formState.errors.description?.message}
        >
          <textarea
            className={cn(inputClassName, 'min-h-32 resize-y')}
            placeholder="Describe the offer, what it does, and why it matters."
            {...form.register('description')}
          />
        </FieldShell>

        <div className="grid gap-5 lg:grid-cols-2">
          <FieldShell
            label="Target audience"
            error={form.formState.errors.audience?.message}
          >
            <input
              className={inputClassName}
              placeholder="Solo founders launching a premium course"
              {...form.register('audience')}
            />
          </FieldShell>
          <FieldShell label="Tone" error={form.formState.errors.tone?.message}>
            <input
              className={inputClassName}
              placeholder="Confident and energetic, calm and premium, playful and modern"
              {...form.register('tone')}
            />
          </FieldShell>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FieldShell
            label="Visual style"
            error={form.formState.errors.visualStyle?.message}
          >
            <input
              className={inputClassName}
              placeholder="Editorial still life, cinematic lifestyle, tactile product macro"
              {...form.register('visualStyle')}
            />
          </FieldShell>
          <FieldShell
            label="Brand color hints"
            hint="Optional: comma-separated color names or style cues."
          >
            <input
              className={inputClassName}
              placeholder="fern green, oat, graphite"
              {...form.register('brandColors')}
            />
          </FieldShell>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FieldShell
            label="Language"
            error={form.formState.errors.language?.message}
          >
            <input className={inputClassName} {...form.register('language')} />
          </FieldShell>
          <FieldShell
            label="Offer / CTA"
            hint="Optional: discounts, waitlist, launch hook, or destination."
          >
            <input
              className={inputClassName}
              placeholder="Free trial, pre-order bonus, waitlist push"
              {...form.register('offer')}
            />
          </FieldShell>
        </div>

        <FieldShell
          label="Custom notes"
          hint="Optional guardrails or channel-specific nuances."
        >
          <textarea
            className={cn(inputClassName, 'min-h-28 resize-y')}
            placeholder="Avoid sounding corporate. Keep every line crisp enough for paid social."
            {...form.register('notes')}
          />
        </FieldShell>

        <div className="flex flex-col gap-4 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-[#8ca296]">
            The generation flow uses Pollinations for structured text output,
            visual generation, and optional TTS. No placeholder data is shown as
            real output.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d7f171] px-6 py-3 font-semibold text-[#08110d] transition hover:bg-[#ecff9f] disabled:cursor-not-allowed disabled:bg-[#556148]"
          >
            <Sparkles className="h-4 w-4" />
            {isSubmitting
              ? 'Generating campaign kit...'
              : hasApiKey
                ? 'Generate campaign kit'
                : 'Connect Pollinations to generate'}
          </button>
        </div>
      </form>
    </section>
  );
}
