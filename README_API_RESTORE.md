# API Restore Patch — worldcup26.ir

This patch restores the Vercel API route to the free worldcup26.ir API.

Files included:
- api/worldcup.js

Replace only this file in your project, then commit and push:

```bash
git add api/worldcup.js
git commit -m "Restore World Cup 2026 free API route"
git push
```

After Vercel redeploys, test:
- /api/worldcup should return `mode: "worldcup26"`
- `provider` should be `worldcup26.ir free API`
- `fixtures` should not be empty
