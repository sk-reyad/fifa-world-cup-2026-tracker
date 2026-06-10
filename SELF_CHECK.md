# Self-check before submission

Checked on: 10 June 2026

## Data checks

- Full fallback fixture count: 104 matches.
- Group stage fixture count: 72 matches.
- Knockout fixture count: 32 matches.
- Groups: 12 groups, A to L.
- Teams: 48 teams.
- Brazil default favourite team support: included.
- Brazil group-stage matches present: Match 6, Match 31, Match 52.
- Major team quick watch support: Argentina, Germany, France, Spain, England, Portugal.
- Every fixture has kickoff time in `+06:00` Bangladesh time format.
- Every fixture has stadium, city and country fields.
- Knockout placeholders included until real teams are known.

## Feature checks

- Folder project structure for GitHub/Vercel: included.
- Dynamic favourite team selector: included.
- Dark/light mode with localStorage: included.
- Today’s matches section: included.
- Global next-match countdown: included.
- Per-match countdown: included.
- Favourite team match countdowns: included.
- Major team countdowns: included.
- Full schedule search/filter: included.
- Group standings auto-calculation from result data: included.
- Flags in match cards and standings: included.
- Horizontal match format: `🇧🇷 Brazil vs Morocco 🇲🇦` style.
- Vertical match format: `🇧🇷 Brazil / VS / 🇲🇦 Morocco` style.
- Notification permission + 20-minute reminder logic: included.
- Sportmonks Vercel API proxy: included.
- API token kept server-side through Vercel environment variable: included.
- Fallback mode when API token is missing: included.

## Technical checks

- JavaScript syntax checked with `node --check` for all JS files.
- Vercel API proxy checked without token; it returns safe fallback JSON instead of crashing.
- No actual API token is included in project files.
- `.env.example` included for setup guidance.
- README includes GitHub, Sportmonks and Vercel setup steps.

## Notes

- Browser-level visual testing was attempted, but the container blocks launching local pages through Chromium. Static code, data counts and JavaScript syntax were still checked.
- Browser notifications are reliable while the page/browser is open. Full background notifications need a deeper PWA/service-worker setup.


## Free API migration recheck

- Replaced paid Sportmonks proxy with free worldcup26.ir proxy.
- Kept fallback schedule so the site does not break if the free API fails.
- Added match-number based merging so knockout placeholders can update when the API fills teams.
- Kept favourite team, today matches, countdowns, standings and full schedule intact.
- Removed the need for paid Sportmonks environment variables.
