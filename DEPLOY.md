# Deploy

HiveLaunch is designed for static hosting. No server runtime is required for the core app.

## Before You Deploy

Set these environment variables in your hosting provider:

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_PUBLIC_APP_URL` | `https://hivelaunch.yourdomain.com` | Must match the real public URL used for Pollinations BYOP redirect |
| `VITE_POLLINATIONS_APP_KEY` | `pk_...` | Optional but recommended so the authorize screen can identify your app |
| `VITE_DEFAULT_TEXT_MODEL` | `openai` | Optional fallback |
| `VITE_DEFAULT_IMAGE_MODEL` | `flux` | Optional fallback |

## Vercel

1. Import the repository into Vercel
2. Keep the framework preset as Vite
3. Add the environment variables above
4. Deploy
5. Confirm the final site URL matches `VITE_PUBLIC_APP_URL`
6. Test the "Connect with Pollinations" flow end to end

Included config:

- [`vercel.json`](./vercel.json)

## Netlify

1. Create a new site from the repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add the environment variables above
5. Deploy
6. Test the Pollinations redirect flow and image generation

Included config:

- [`netlify.toml`](./netlify.toml)

## BYOP Redirect Checklist

- `VITE_PUBLIC_APP_URL` uses the final production URL
- the deployed app is served over HTTPS
- the Pollinations authorize flow returns to the same URL
- the app captures and clears `#api_key=...` from the browser location

## Recommended Final Smoke Test

1. Load the deployed app with no saved key
2. Connect through Pollinations BYOP
3. Generate a campaign kit
4. Generate at least one image
5. Generate voiceover audio if your key supports it
6. Export Markdown, JSON, and ZIP
