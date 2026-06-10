# FIFA World Cup 2026 Tracker — BST Edition

A GitHub/Vercel-ready football dashboard for FIFA World Cup 2026 with Bangladesh Standard Time fixtures, countdown timers, dynamic favourite team focus, group standings, flags, venue details, browser alerts and worldcup26.ir live API integration.

## Features

- Full 104-match FIFA World Cup 2026 schedule in Bangladesh Standard Time.
- Dynamic favourite team selector. Default favourite is Brazil.
- Favourite team highlight section with large next-match card.
- Today’s matches section based on Bangladesh date.
- Live countdown on the global next match, favourite matches, today’s matches, major teams and every schedule card.
- Major teams quick watch: Argentina, Germany, France, Spain, England and Portugal.
- Full schedule grouped by date/stage.
- Group standings auto-calculated from match results.
- Flags beside all team names.
- Venue format: stadium, city, country.
- Dark mode and light mode with saved preference.
- Browser notification permission + 20-minute match reminder logic.
- worldcup26.ir API proxy through Vercel serverless function so the token is not exposed in frontend code.
- Fallback schedule works even before the API token is connected.

## Important data notes

The fallback schedule uses published Bangladesh-time fixtures and manually mapped stadium details. The worldcup26.ir API proxy is included for live scores, official result updates, standings and knockout updates once your worldcup26.ir token is connected.

If worldcup26.ir changes the official World Cup 2026 season ID in your dashboard, update `SPORTMONKS_SEASON_ID` in Vercel Environment Variables.

## Project structure

```text
fifa-world-cup-2026-tracker/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── countdown.js
│       ├── data-fallback.js
│       ├── favourites.js
│       ├── notifications.js
│       ├── standings.js
│       └── ui.js
├── api/
│   └── worldcup.js
├── .env.example
├── manifest.json
├── package.json
├── vercel.json
└── README.md
```

## Local preview without API

You can open `index.html` directly in a browser. The fallback schedule, countdowns, theme toggle, favourite team selector, groups and initial standings will work.

For the Vercel API proxy locally, install Vercel CLI and run:

```bash
npm install -g vercel
vercel dev
```

Then open the local URL Vercel gives you.

## How to get worldcup26.ir API token — step by step

1. Go to worldcup26.ir World Cup API page: `https://www.sportmonks.com/football-api/world-cup-api/`
2. Click **Get API Access**, **Start building**, **Try for free**, or similar button.
3. Create a MySportMonks account or log in.
4. Choose a World Cup 2026 plan that includes fixtures, live scores, standings and bracket data.
5. Open your MySportMonks dashboard.
6. Find the API token section. It may be named **API Token**, **My Token**, **Football API Token**, or similar.
7. Copy the token only. Do not share your worldcup26.ir password.
8. Keep the token private. Do not paste it inside frontend files such as `app.js` or `data-fallback.js`.

## How to add API token in Vercel — step by step

1. Push this folder to a GitHub repository.
2. Go to `https://vercel.com/` and log in.
3. Click **Add New** → **Project**.
4. Import your GitHub repository.
5. Keep framework as **Other** or **Static**, if Vercel asks.
6. Before deploying, open **Environment Variables**.
7. Add this variable:

```text
SPORTMONKS_API_TOKEN=your_sportmonks_api_token_here
```

8. Add this optional variable if needed:

```text
SPORTMONKS_SEASON_ID=23706
```

9. Click **Deploy**.
10. After deployment, open the website and click **Refresh Data** in the Live Scoreboard section.
11. If the API is connected, the header will show a worldcup26.ir connected status. If not, the site will continue using fallback schedule mode.

## GitHub upload — simple VS Code steps

Open the project folder in VS Code. Then open terminal inside VS Code and run:

```bash
git init
git add .
git commit -m "Initial FIFA World Cup 2026 tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

If `git remote add origin` says origin already exists, use:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

## Updating manual scores if API is not connected

Open `assets/js/data-fallback.js`, find the match object, and update:

```js
"status": "finished",
"homeScore": 2,
"awayScore": 1
```

The group standings will calculate points, wins, draws, losses, goals for, goals against and goal difference automatically.

## Limitations

- Browser notifications are most reliable while the website tab/browser is open. Full background alerts need a deeper PWA/service-worker setup.
- A public GitHub Pages-only site cannot hide a paid API token. Use Vercel with Environment Variables for live API mode.
- Knockout placeholders are shown until official teams are known through live API data or manual result updates.


## Free API migration note

This version uses the free `worldcup26.ir` API through `/api/worldcup`.
No paid Sportmonks plan is required.

Default provider:

```text
https://worldcup26.ir/get/games
https://worldcup26.ir/get/groups
https://worldcup26.ir/get/teams
https://worldcup26.ir/get/stadiums
```

The website still keeps the local fallback schedule. If the free API is down, slow, rate-limited, or changes its response format, the dashboard will continue running in fallback schedule mode.

Optional Vercel environment variable:

```text
WORLDCUP26_API_BASE=https://worldcup26.ir
```

You do not need `SPORTMONKS_API_TOKEN`, `SPORTMONKS_SEASON_ID`, or `SPORTMONKS_API_BASE` anymore.
