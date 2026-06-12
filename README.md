# FIFA World Cup 2026 Tracker | BST Edition

## Overview

**FIFA World Cup 2026 Tracker** is a modern, responsive match-tracking web application built for football fans who want to follow the tournament in **Bangladesh Standard Time (BST)**.

The project displays the full FIFA World Cup 2026 schedule, today’s matches, live scoreboard, favourite team focus, followed teams, results, group standings, and knockout bracket in one clean interface. It is designed with a strong football-themed UI, dynamic match cards, countdown timers, flag rendering, browser notifications, and a fallback-first data system so the website remains useful even when live API data is unavailable.

This project is built with plain **HTML**, **CSS**, and **JavaScript**, with an optional **Vercel serverless API route** for syncing live World Cup data from a free API source.

## Features

- Full FIFA World Cup 2026 match schedule with **104 fixtures**
- Bangladesh Standard Time based date and time display
- Dynamic hero dashboard showing the next match, live match, or latest finished result
- Today’s Matches section with upcoming, live, and finished match states
- Favourite team selector with saved preference using `localStorage`
- Followed Teams watchlist where users can add or remove teams
- Live Scoreboard section for live games, final scores, and upcoming kickoffs
- Results section with team and date filters
- Full Schedule section with search, date filter, team filter, and stage filter
- Expand/collapse schedule days for better browsing
- Group standings calculated from available finished match scores
- Knockout bracket from Round of 32 to Final with placeholder support
- Match countdown timers for upcoming fixtures
- Browser notification support for match reminders before kickoff
- SVG flag rendering through FlagCDN instead of emoji flags
- Dark and light theme toggle with saved theme preference
- Sticky navigation, mobile menu, and back-to-top interaction
- Responsive card layout for desktop, tablet, and mobile screens
- Universal match-card grid behavior where 1 card fills the row, 2 cards split the row, and 3 cards form a balanced row
- Local fallback schedule data so the website can still render without API access
- Free API proxy through `/api/worldcup` for live data syncing
- No paid API key or environment variable required

## Technologies Used

- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- **LocalStorage**
- **Web Notifications API**
- **FlagCDN**
- **Vercel Serverless Function**
- **Free World Cup API integration**
- **Responsive CSS Grid and Flexbox**

## What I Learned

While building this project, I practiced structuring a larger frontend project using multiple JavaScript modules instead of keeping all logic in one file. The project helped me understand how to separate responsibilities between data handling, UI rendering, countdown logic, standings calculation, favourites, notifications, and API syncing.

I learned how to manage frontend state manually with vanilla JavaScript, including selected favourite teams, followed teams, filters, collapsed schedule days, API mode, and live sync updates. I also worked with `localStorage` to make user preferences persistent across page reloads.

Another important learning outcome was building a resilient data flow. The website starts with local fallback data, then attempts to sync match updates through the `/api/worldcup` route. This makes the project more reliable because the interface does not depend completely on a live API response.

The project also improved my understanding of DOM rendering, reusable UI functions, dynamic card generation, responsive layouts, table rendering, browser notification permission handling, countdown timers, and real-world UI edge cases such as long team names, mobile readability, and live/finished match status handling.

## Project Structure

```text id="8rn7yk"
fifa-world-cup-2026-tracker/
│
├── index.html
├── README.md
├── README_API_RESTORE.md
├── SELF_CHECK.md
│
├── api/
│   └── worldcup.js
│
└── assets/
    ├── css/
    │   └── style.css
    │
    └── js/
        ├── app.js
        ├── countdown.js
        ├── data-fallback.js
        ├── favourites.js
        ├── notifications.js
        ├── standings.js
        └── ui.js
```

### `index.html`

Contains the complete page structure, including the header, navigation, hero dashboard, favourite team section, today’s matches, followed teams, scoreboard, results, full schedule, bracket, standings, and footer.

### `style.css`

Controls the full visual design of the website. It includes dark/light theme variables, football-style backgrounds, glassmorphism cards, responsive grids, match-card layouts, standings tables, bracket styling, mobile fixes, and special handling for long team names such as “Bosnia and Herzegovina”.

### `app.js`

Acts as the main controller of the website. It manages state, renders all sections, handles filters, updates the clock, controls favourite and followed teams, merges live API data, refreshes the UI, and binds user interactions.

### `ui.js`

Contains reusable UI helper functions for generating match cards, hero panels, team labels, flags, status badges, score displays, penalty lines, countdown containers, and empty states.

### `data-fallback.js`

Stores the local fallback tournament data, including tournament metadata, groups, flags, venues, and all 104 fixtures. This allows the website to work even if the live API is unavailable.

### `countdown.js`

Handles countdown calculations and renders countdown boxes for upcoming matches.

### `standings.js`

Calculates group standings from finished group-stage fixtures using points, wins, draws, losses, goals for, goals against, and goal difference.

### `favourites.js`

Manages the favourite team selection and saves it in the browser using `localStorage`.

### `notifications.js`

Handles browser notification support, match reminder toggling, saved notification preferences, and reminder triggering before kickoff.

### `api/worldcup.js`

Works as a Vercel serverless API route. It connects to the free World Cup API source, normalizes match/team/stadium/group data, supports fallback handling, and returns clean fixture data to the frontend.

## How It Works

When the website loads, it first uses the bundled fallback data from `data-fallback.js`. This gives the app immediate access to the full tournament schedule, group data, team flags, venues, and placeholder knockout fixtures.

The main app state is created in `app.js`. From there, the UI renders the hero dashboard, favourite team focus, today’s matches, followed teams, live scoreboard, results, schedule, bracket, and standings.

The app then tries to fetch updated fixture data from:

```text id="450lhr"
/api/worldcup
```

If the API route returns valid fixture data, the app merges the updated live information into the existing fallback fixtures. This can update match status, scorelines, penalty scores, team names, kickoff times, venues, and bracket placeholders when available.

The schedule section allows users to search by team, group, venue, date, or stage. Users can also filter by team, date, and match type. Schedule days can be collapsed or expanded to make the full fixture list easier to browse.

For upcoming matches, countdown timers update every second. For live and finished matches, the match card switches from a simple “VS” display to a score-focused display. The app also refreshes key card sections after kickoff so the UI does not keep showing a match as upcoming after it has already started.

Favourite teams and followed teams are saved in the browser. This makes the tracker feel personal because the user can focus on the teams they care about most without selecting them again every time.

Group standings are calculated from available finished group-stage results. The table sorts teams by points, goal difference, goals scored, and team name.

## Setup and Usage

### Option 1: Run as a Static Website

Clone or download the project files, then open `index.html` in your browser.

The website can still display the fallback schedule without running a backend.

```bash id="y1y9m2"
git clone https://github.com/your-username/your-repository-name.git
cd your-repository-name
```

Then open:

```text id="fzz22m"
index.html
```

### Option 2: Deploy on Vercel for API Support

To use the `/api/worldcup` serverless route, deploy the project on Vercel.

Recommended Vercel settings:

```text id="akv4qb"
Framework Preset: Other
Build Command: Leave blank
Install Command: Leave blank
Output Directory: Leave blank or .
Root Directory: Repository root
Environment Variables: None required
```

After deployment, test the API route:

```text id="bewv65"
https://your-vercel-domain.vercel.app/api/worldcup
```

If the API works, the frontend will sync available live fixture data automatically. If the API fails or returns no data, the website will continue using the local fallback schedule.

## Future Improvements

- Add match detail pages with scorers, cards, substitutions, and match timeline if reliable API data becomes available
- Add a timezone selector for users outside Bangladesh
- Add service worker caching for stronger offline support
- Add advanced bracket progression when confirmed knockout teams become available
- Add team profile cards with group, flag, fixtures, and result history
- Improve accessibility further with more keyboard-focused interactions and screen-reader refinements
- Add optional backend caching to reduce repeated API requests and improve reliability

## Author

**SK Reyad Ali**

## Contact

- Email: skreyad2016@gmail.com
- LinkedIn: https://www.linkedin.com/in/sk-reyad/
