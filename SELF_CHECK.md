# Self-check

Clean free API version prepared with these checks:

- Removed `package.json`.
- Removed `vercel.json`.
- Removed `.env.example` and all Sportmonks setup requirements.
- Kept `api/worldcup.js` as a Vercel serverless function using `worldcup26.ir` free API.
- Confirmed `api/worldcup.js` passes Node syntax check.
- Confirmed the ZIP root contains project files directly, not an extra nested project folder.
- Website keeps fallback schedule support, so it does not break if the free API is unavailable.
