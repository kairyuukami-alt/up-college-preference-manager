# Development setup

Use Node.js 24 on Linux or WSL, then run `npm ci`. Keep `package-lock.json` unchanged unless intentionally updating a dependency. `npm run build` produces `dist/server/index.js` and associated assets.

For database-backed local development:

1. Run `npm run dev` once so the Cloudflare Vite integration generates its local configuration; stop it after startup if preparing migrations separately.
2. Use Wrangler with the generated local configuration to apply the journal's SQL files to the local `DB` binding in order. Run `npx wrangler d1 execute --help` for the installed version's arguments. Always use `--local`; never target production for local setup.
3. Configure a disposable local `PREFERENCE_UNLOCK_PASSWORD` through the local Cloudflare development environment (a git-ignored `.dev.vars` file). Use a four-digit test value compatible with the current login form. Leave the committed example blank.
4. Restart `npm run dev` and use synthetic students. Local R2 objects and D1 state belong in ignored runtime directories.

Useful checks:

```bash
python3 scripts/check-migrations.py
npm run build
node --test tests/*.test.mjs
```

Generate new migrations with `npm run db:generate`. Review generated SQL for compatibility with D1. Local SQLite validation checks schema consistency; it is not a complete production runtime test.

The original starter reference is retained in `docs/starter-reference.md` for historical context; the application schema is no longer empty and the portal uses app-owned admin/student sessions.
