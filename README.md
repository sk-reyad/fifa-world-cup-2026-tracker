# FIFA World Cup 2026 Match Tracker — Clean Free API Build

This is a clean rebuild of the FIFA World Cup 2026 BST Match Tracker.

What is included:

- Football-themed responsive website
- Bangladesh Standard Time display
- Today’s matches
- Global and per-match countdowns
- Dynamic favourite team selector, default Brazil
- Major teams quick-watch section
- Full schedule with search and filters
- Group standings calculated from available results
- Groups A–L with flags
- Browser notification buttons for 20-minute reminders
- Free API proxy at `/api/worldcup`
- Local fallback schedule so the site keeps working if the free API is unavailable

What is intentionally not included:

- No `package.json`
- No `vercel.json`
- No `.env` or `.env.example`
- No paid API key setup
- No environment variables required

## Files

- `index.html`
- `assets/css/style.css`
- `assets/js/data-fallback.js`
- `assets/js/app.js`
- `assets/js/ui.js`
- `assets/js/countdown.js`
- `assets/js/standings.js`
- `assets/js/favourites.js`
- `assets/js/notifications.js`
- `api/worldcup.js`
- `README.md`
- `SELF_CHECK.md`

## How to replace your current folder

Delete everything inside your existing project folder except the hidden `.git` folder.
Then extract this ZIP into that same project folder.

After extracting, push with:

```powershell
git add -A
git commit -m "Clean rebuild with free World Cup API"
git push
```

## Vercel settings

Use simple settings:

- Framework Preset: Other
- Build Command: blank
- Install Command: blank
- Output Directory: blank or `.`
- Root Directory: repo root
- Environment Variables: none required

## Test after deploy

Open:

```text
https://YOUR-VERCEL-DOMAIN/api/worldcup?t=clean-free
```

Expected successful API route format:

```json
{
  "mode": "worldcup26",
  "provider": "worldcup26.ir free API",
  "requiresApiKey": false
}
```

If the free API returns no data, the main website still works using local fallback data.


## Flag rendering

Team flags are rendered as SVG images through FlagCDN URLs such as `https://flagcdn.com/br.svg`, not as emoji flags. This avoids broken flag emoji rendering on Windows/browser combinations.
