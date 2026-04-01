import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

import { BrandMark } from '@/components/BrandMark';

interface HeroSectionProps {
  hasKey: boolean;
  onConnect: () => void;
}

export function HeroSection({ hasKey, onConnect }: HeroSectionProps) {
  return (
    <section className="hero-grid relative overflow-hidden border-b border-white/6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(215,241,113,0.18),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(102,208,140,0.16),transparent_22%),linear-gradient(180deg,rgba(8,17,13,0.92),rgba(8,17,13,0.72))]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-14 px-6 py-8 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#9bb5a4] glass-panel">
            Built with{' '}
            <a
              className="font-semibold text-[#d7f171] hover:text-white"
              href="https://pollinations.ai"
              target="_blank"
              rel="noreferrer"
            >
              pollinations.ai
            </a>
          </div>
        </div>

        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d7f171]/20 bg-[#d7f171]/10 px-4 py-2 text-sm text-[#d7f171]">
              <Sparkles className="h-4 w-4" />
              BYOP campaign engine for creators, solo founders, and small teams
            </div>
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Turn one product brief into a{' '}
              <span className="text-gradient">ready-to-launch campaign kit.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b9cabf]">
              HiveLaunch turns a single brief into campaign angles, headlines,
              captions, CTAs, image prompts, generated visuals, and optional
              voiceover assets using your own Pollinations account.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#studio"
                className="inline-flex items-center gap-2 rounded-full bg-[#d7f171] px-6 py-3 font-semibold text-[#08110d] transition hover:bg-[#efffa5]"
              >
                Launch a campaign
                <ArrowRight className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onConnect}
                className="rounded-full border border-white/12 bg-white/6 px-6 py-3 font-semibold text-white transition hover:border-[#d7f171]/40 hover:bg-white/10"
              >
                {hasKey ? 'Reconnect Pollinations' : 'Connect with Pollinations'}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut', delay: 0.12 }}
            className="glass-panel rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,29,21,0.96),rgba(8,17,13,0.78))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full border border-[#d7f171]/20 bg-[#d7f171]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#d7f171]">
                How it works
              </span>
              <span className="text-sm text-[#9bb5a4]">No backend required</span>
            </div>
            <div className="space-y-5">
              {[
                [
                  '1. Shape the brief',
                  'Define the product, audience, tone, visual style, and CTA in one focused form.',
                ],
                [
                  '2. Generate the kit',
                  'Pollinations returns structured copy, prompt recipes, and optional voiceover script output.',
                ],
                [
                  '3. Produce launch assets',
                  'Regenerate visuals per prompt, review locally saved sessions, and export the bundle as Markdown, JSON, or ZIP.',
                ],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="border-l border-white/10 pl-4 text-sm leading-7 text-[#9bb5a4]"
                >
                  <div className="font-display text-xl font-semibold text-white">
                    {title}
                  </div>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
