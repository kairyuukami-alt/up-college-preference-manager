# Architecture

The application uses React/TypeScript with Vinext, compiled into a Cloudflare Worker. `app/` contains pages and API routes; `components/portal-entry.tsx` switches between authenticated admin/student screens.

`lib/portal-auth.ts` implements the existing session and PIN authentication. `requireAdmin` and `requireStudent` enforce server-side access. `PREFERENCE_UNLOCK_PASSWORD` is read from the hosted environment. Public Site access does not expose the authenticated admin API.

D1 is accessed through `db/index.ts`. `db/schema.ts` declares the schema; generated SQL in `drizzle/` owns migration history. R2 contains uploaded document bytes, while D1 stores their metadata.

## Student Directory

`student_directory` stores one admin-managed student record, optional unique NEET application number, revision, timestamps and an archive marker. Its validated JSON payload contains contact information, follow-ups and counselling enrolments. Each enrolment contains four round records and an optional link to an existing preference list.

`app/api/admin/directory/route.ts` implements read, create, edit, remove and restore. Writes validate the payload and reject duplicate application numbers or choice-list links. Revision checks prevent stale overwrites. Removing a record only archives the directory entry; linked preference lists, profiles and login records remain intact.

Existing preference lists are shown for explicit linking. No automatic name-based identity merge is performed. Directory statuses are manual records, while saved-choice lock state is read from the linked list.

## Results and operational data

Bundled official result data is under `lib/official-result-data*.ts`. Database result records, student casework, schedules and directory round fields serve different purposes. Do not assume updating one silently updates all others. Verify the official publication before recording an allotment.

## Runtime boundaries

Worker production code must remain Cloudflare-compatible. Some production imports cannot execute in Node alone; the existing rendered-output test documents its skip behavior. The directory API tests use synthetic data and an in-memory SQLite adapter, not the production D1 database.
