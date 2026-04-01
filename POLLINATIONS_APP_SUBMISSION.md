# Pollinations App Submission Draft

App Name:
HiveLaunch

App Description:
HiveLaunch is a polished BYOP creative studio that turns one product or service brief into a ready-to-use mini campaign kit using Pollinations.ai. Users can generate campaign angles, headlines, captions, CTAs, image prompt recipes, visual assets, and optional voiceover scripts/audio in one workflow. The app uses Pollinations for structured text generation, image generation, and optional audio generation, while keeping usage on the user's own Pollinations account through BYOP-ready key flows.

App Language:
English

Live URL:
[DEPLOYED_PUBLIC_URL]

Open Source Repo:
[GITHUB_REPO_URL]

Contact:
[CONTACT_DETAILS]

## What HiveLaunch Does

HiveLaunch helps creators, solo founders, marketers, and small businesses turn one product brief into a focused launch kit:

- campaign concept summary
- audience insight
- campaign angles
- ad headlines
- social captions
- CTA options
- image prompt recipes
- generated campaign visuals
- optional voiceover script
- optional generated MP3 voiceover

## How It Uses Pollinations

- Pollinations chat completions generate the structured campaign plan
- Pollinations image generation creates visuals from the generated prompt recipes
- Pollinations audio generation powers optional voiceover output
- Pollinations BYOP authorization lets users connect their own key through the official redirect flow
- Pollinations model discovery is used to populate text and image model selectors dynamically when available

## BYOP Story

HiveLaunch is built for real user-owned Pollinations usage:

- users can paste a Pollinations key manually
- users can connect through the official Pollinations authorize flow
- returned `#api_key=...` fragments are parsed client-side and cleared immediately
- keys are only saved locally if the user explicitly chooses to store them
- no secret key is hardcoded or committed

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- zod
- Vitest
- GitHub Actions

## Deployment

HiveLaunch is static-host friendly and can be deployed on Vercel or Netlify without a custom backend.

## Attribution

Built with pollinations.ai: https://pollinations.ai
