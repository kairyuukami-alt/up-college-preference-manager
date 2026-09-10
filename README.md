# VidyaSaarthi Counselling Portal

Student counselling operations, college preference lists, profiles, documents, results and round-wise tracking for the VidyaSaarthi team.

[Open the live portal](https://up-college-preference-manager.kairyuukami.chatgpt.site)

## Included features

- **Student Directory:** one record per student, multiple counselling enrolments, R1–R4 participation and progress, results and allotments, reporting, completion tags, follow-ups, counsellor assignment, CSV export, and reversible removal.
- **Choice filling:** upload college master lists, prepare student preference lists, lock choices, manage PINs, recover saved versions, and print/export.
- **Profiles and documents:** student-specific access, required-document checklists, review, profile locks and document downloads.
- **Administration:** operations dashboard, counselling casework, tasks, finances, communication notes and announcements.
- **Result Desk and schedules:** published result datasets, result import/search and counselling schedules. Official updates still require verification; the repository does not promise unattended monitoring.

The directory is an independent admin screen. Existing choice lists are linked explicitly; students are never merged solely because their names match. Round statuses and allotments are entered by an administrator. Removing a directory record preserves linked profiles and choices.

## Repository structure

| Path | Purpose |
| --- | --- |
| `app/` | Pages and server API routes |
| `components/` | Portal screens and shared UI components |
| `lib/` | Validation, authentication, counselling logic and bundled official data |
| `db/` | D1 access and schema declarations |
| `drizzle/` | Versioned database migrations and snapshots |
| `public/` | Brand images and static assets |
| `worker/`, `build/` | Cloudflare Worker entry point and build integration |
| `.openai/hosting.json` | Existing Sites identity and logical storage bindings |
| `tests/` | Privacy contracts, directory API/database tests and UI checks |
| `.github/` | Build workflow, issue forms and PR template |
| `docs/` | Architecture, development, release and operational guidance |

## Development

Use **Node.js 24** and npm on Linux or WSL. Installation and build helpers use `bash`, `curl`, `flock` and GNU `timeout`.

```bash
npm ci
npm run build
node --test tests/*.test.mjs
npm run dev
```

The package lockfile is authoritative. To use the bounded Sites installation helper, run `npm run install:ci`. A restricted local network may prevent downloads; a successful Sites remote build is a separate publication path, not a reason to replace locked dependencies.

`npm run dev` starts the local app with simulated Cloudflare bindings. Database-backed screens additionally need local D1 migrations and a **local-only** administrator password. See [Development](docs/DEVELOPMENT.md). Never use production data or credentials for local tests.

## Branches and releases

- `main`: reviewed source baseline, initially synced from the live Student Directory release.
- `develop`: integration branch for upcoming work.
- `release/2026-09-10`: snapshot of the published Student Directory release source.
- `backup/pre-github-sync-2026-09-10`: original GitHub state preserved before this sync.
- `feature/<topic>` and `fix/<topic>`: create from `develop`, open a PR back to `develop`, then promote reviewed changes to `main`.

GitHub Actions builds and tests pushes to `main`, `develop` and release branches, and pull requests. **A GitHub push does not publish the Sites website.** Follow the [release process](docs/RELEASES.md).

## Data and configuration

D1 stores live student records and R2 stores uploaded documents. These are not repository files. The GitHub source includes existing bundled official result datasets and brand assets, but no live database dump, uploaded student documents, session cookies or runtime passwords.

Configure `PREFERENCE_UNLOCK_PASSWORD` as a hosted secret through Sites. D1 and R2 bindings are named `DB` and `BUCKET`. The public homepage and private admin/student sessions retain the existing access model.

See [Architecture](docs/ARCHITECTURE.md), [Contributing](CONTRIBUTING.md), [Security](SECURITY.md), and [Operations](docs/OPERATIONS.md).

## Source provenance

Application source was imported from published Sites source commit `51cb589ed19281ee04c8f99d00ec5271985b4e11` (Student Directory release, 10 September 2026). GitHub keeps its existing initial commit as the parent of the import; Sites history remains in the Sites source repository. GitHub-specific documentation and automation are maintained alongside the imported application source.
