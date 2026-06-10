# FIFA World Cup 2026 Match Tracker — Clean Free API Version

This is a clean GitHub/Vercel-ready version of the FIFA World Cup 2026 Match Tracker.

Important: this version does **not** use Sportmonks and does **not** need any API key or Vercel Environment Variables.

Data source priority:
1. Free API proxy: `/api/worldcup`, which fetches data from `worldcup26.ir`.
2. Local fallback schedule: `assets/js/data-fallback.js`, so the website still works if the free API is down.

## What is included

- `index.html`
- `assets/css/style.css`
- `assets/js/` scripts
- `api/worldcup.js` Vercel serverless proxy for the free API
- `manifest.json`
- `README.md`
- `SELF_CHECK.md`

## What is intentionally removed

- No `package.json`
- No `vercel.json`
- No `.env.example`
- No Sportmonks token or paid API setup

This avoids the Vercel JSON/runtime/package parsing errors that happened before.

## Deploy notes

In Vercel, keep settings simple:

- Framework Preset: Other
- Build Command: blank
- Install Command: blank
- Output Directory: blank or `.`
- Root Directory: repo root
- Environment Variables: none required

## Test after deploy

Open:

`https://YOUR-VERCEL-DOMAIN/api/worldcup?t=free-api`

A successful free API proxy response should include:

`"mode": "worldcup26"`

If the free API is temporarily down, the main website will still work using fallback schedule data.
