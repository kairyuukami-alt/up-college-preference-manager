# Releases and GitHub / Sites synchronization

## Branch flow

Work on `feature/*` or `fix/*` from `develop`. Merge reviewed changes to `develop`, then promote a tested release to `main`. Use a named `release/YYYY-MM-DD` branch to preserve a release snapshot. Do not rewrite the published migration history or force-push shared branches.

## Current imported release

- Date: 2026-09-10
- Feature: standalone Student Directory and four-round counselling tracking
- Sites source: `51cb589ed19281ee04c8f99d00ec5271985b4e11`
- Result: full remote Sites build and publication succeeded
- Existing GitHub history is preserved as the import's parent and in the backup branch.

## Publishing

GitHub Actions validates source; it does not automatically deploy this Sites project. To release:

1. Confirm the GitHub change is reviewed and its checks are successful.
2. Reconcile changes with the existing Sites checkout. Compare both histories; never overwrite newer Sites work with an older GitHub snapshot.
3. Preserve `.openai/hosting.json` and the existing Site identity. Build the exact source and include new migrations.
4. Save the source version through Sites and explicitly publish to the existing site's audience.
5. Confirm terminal deployment success and record the deployed source revision here.
6. Sync subsequent Sites source changes back to GitHub through a new branch and PR. Preserve GitHub-only workflow/documentation files.

A GitHub repository backup does not back up live D1 records or R2 uploads. Database and document backups need their own operational process.

## Rollback

Identify the last successfully published Sites version before initiating a rollback. Reverting code does not reverse database migrations. Check schema compatibility and preserve data before publishing an older code version. Do not delete an applied migration to simulate a rollback.
