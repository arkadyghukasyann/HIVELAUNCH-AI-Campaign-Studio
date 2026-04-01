# AGENTS.md

## Project

HiveLaunch is a client-first React and TypeScript application that turns one product brief into a campaign kit using Pollinations.ai for structured text generation, image generation, and optional audio generation.

## Runbook

- Install with `npm install`
- Start local dev with `npm run dev`
- Verify before shipping with `npm run check`
- Production build output is `dist/`

## Architecture Rules

- Keep the product focused on campaign generation. Do not turn HiveLaunch into a generic AI sandbox.
- Preserve the client-first architecture unless a backend is clearly required.
- All Pollinations transport logic belongs in [`src/lib/pollinations.ts`](./src/lib/pollinations.ts).
- Keep schema validation in [`src/schema/campaign.ts`](./src/schema/campaign.ts).
- Keep local persistence logic in [`src/lib/storage.ts`](./src/lib/storage.ts).
- Keep export helpers in [`src/lib/export.ts`](./src/lib/export.ts).
- Pollinations attribution must remain visible in both the UI and docs.

## Coding Conventions

- TypeScript only for app code
- Prefer small, composable components
- Validate model output before rendering it
- Do not hardcode keys, secrets, or fake generation results
- Use ASCII by default unless an existing file already requires something else
- Keep comments short and only where they clarify non-obvious logic

## Pollinations-Specific Rules

- Support both manual key mode and official BYOP connect mode
- Always parse and clear the returned `#api_key=...` fragment client-side
- Keep keys local to the browser unless the user explicitly saves them
- Prefer graceful fallback behavior when live model discovery fails
- If changing generation prompts or response parsing, update tests in `src/schema/campaign.test.ts` or related helper tests

## UX Rules

- No fake mock outputs presented as real results
- Every loading state should be explicit
- Every error state should be meaningful
- Empty states should explain the next step clearly
- Keep the interface polished, dark, and campaign-product oriented

## Release Checklist

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- README and submission docs still match product behavior
- `.env.example` still reflects required configuration

## Safe Extension Ideas

- additional export formats
- richer model metadata display
- smarter session search or tagging
- image variation workflows
- guarded audio fallback support if Pollinations audio models change
