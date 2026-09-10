# Contributing

1. Start with the latest `develop` and create `feature/<topic>` or `fix/<topic>`.
2. Keep a change focused. Preserve official college names, counselling identifiers and record ownership.
3. For schema changes, update `db/schema.ts`, run `npm run db:generate`, and inspect the new SQL and snapshot. Never edit a migration that has already been applied.
4. Build and run `node --test tests/*.test.mjs`. Use synthetic student data for tests.
5. Open a PR to `develop` using the template. Describe the problem, resulting behavior, validation and any migration impact.
6. Promote reviewed integration changes to `main` through a release PR. Publishing to Sites remains an explicit release step.

Do not commit runtime secrets, database exports, uploaded student documents, local caches or compiled output. The repository is public. Use the private reporting process in `SECURITY.md` for vulnerabilities.

Branch protection is not enforced by documentation. A repository administrator can configure `main` and `develop` to require pull requests and the `Build and test` status check after its first successful run. Choose reviewer requirements appropriate to the available team; avoid requiring an unavailable reviewer on a sole-maintainer project.
