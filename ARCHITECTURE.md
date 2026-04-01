# Architecture

## Overview

HiveLaunch is a static-friendly React application with no custom backend. The browser talks directly to Pollinations.ai using the user's own key, which keeps deployment simple and makes the BYOP story obvious for reviewers.

## Core Flow

1. The user connects a Pollinations key manually or through the official authorize redirect flow.
2. The user submits a campaign brief.
3. HiveLaunch requests a structured campaign plan from Pollinations chat completions.
4. The response is validated with zod before rendering.
5. Prompt recipes can be turned into visuals through Pollinations image generation.
6. The optional voiceover script can be turned into MP3 audio.
7. Sessions are stored locally and can be exported as Markdown, JSON, or ZIP.

## Main Modules

### App orchestration

- `src/App.tsx`
- Holds top-level state, session history, settings, connection state, and generation handlers

### Pollinations client

- `src/lib/pollinations.ts`
- Contains all live API requests for model discovery, key inspection, text generation, image generation, and audio generation

### Auth helpers

- `src/lib/auth.ts`
- Builds the official BYOP authorize URL
- Parses `#api_key=...` fragments
- Clears the fragment after capture

### Validation

- `src/schema/campaign.ts`
- Defines the campaign brief schema
- Defines the campaign response schema
- Extracts JSON from model output
- Normalizes the final `CampaignPlan`

### Persistence

- `src/lib/storage.ts`
- Stores settings, saved key, brief draft, and recent sessions in localStorage

### Export

- `src/lib/export.ts`
- Produces Markdown, JSON, downloadable images, and ZIP bundles
- Lazy-loads JSZip so export tooling does not bloat the main bundle

## Product Surfaces

- `src/components/HeroSection.tsx`
- `src/components/BriefForm.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/CampaignWorkspace.tsx`
- `src/components/HistoryPanel.tsx`
- `src/components/ExportPanel.tsx`

## Data Model

The central shape is `CampaignPlan` in `src/types/campaign.ts`.

It includes:

- original brief
- structured campaign messaging
- prompt recipes
- optional voiceover script
- model metadata
- raw response preview for debugging

## Design Constraints

- no hidden server-side key
- no fake content
- no database requirement
- no backend-only business logic
- strong fallback behavior when live Pollinations discovery or parsing fails

## Deployment

HiveLaunch is intended for static hosting providers such as Vercel or Netlify. The only deployment-sensitive requirement is that `VITE_PUBLIC_APP_URL` must match the final public URL used in the Pollinations authorize redirect flow.
