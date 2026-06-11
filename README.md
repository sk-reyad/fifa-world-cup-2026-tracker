# FIFA World Cup 2026 Match Tracker — Clean Free API Build

This is a clean rebuild of the FIFA World Cup 2026 BST Match Tracker.

What is included:

- Football-themed responsive website
- Batch 1 UI refinement: sticky navbar, top status bar, proper SVG icons, improved background base, relocated controls, dropdown visual fixes
- Batch 2 UI refinement: match-focused hero auto-shift, unified score/card layout, redesigned favourite section, dynamic followed teams, results section, improved live/finished score display, stronger light-mode background treatment
- Bangladesh Standard Time display
- Today’s matches with upcoming/live/finished card states
- Global and per-match countdowns with fixed countdown boxes
- Dynamic favourite team selector inside the Favourite Team section, default Brazil
- Dynamic followed teams section replacing the old static major-teams watchlist
- Results section for finished matches when score data is available
- Full schedule with search and filters inside the Schedule section toolbar
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
git commit -m "Add hero auto shift cards results and followed teams"
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

## Patch after Batch 2

- Added a stronger API loading fallback: the app tries the Vercel serverless `/api/worldcup` route first, then tries the free `worldcup26.ir` browser endpoint directly before using local fallback data.
- Improved the Favourite Team timeline grid so two related matches fill the available row instead of leaving an empty third column.

Suggested commit message:

```bash
git add -A
git commit -m "Fix API loading and favourite timeline layout"
git push
```
