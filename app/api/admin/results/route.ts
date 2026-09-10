import { getD1 } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import {
  RESULT_AUTHORITIES,
  cleanCandidateIdentifier,
  cleanResultText,
  isOfficialResultUrl,
  releaseFromRow,
  resultAuthority,
  resultFromRow,
  type ResultRelease,
} from "@/lib/counselling-results";
import { OFFICIAL_RESULT_RELEASES, OFFICIAL_RESULTS } from "@/lib/official-result-data";
import { requireAdmin } from "@/lib/portal-auth";

const RESULT_SELECT = `
  SELECT id, authority, round_name AS roundName,
         candidate_identifier AS candidateIdentifier, identifier_type AS identifierType,
         student_name AS studentName, neet_air AS neetAir, college_name AS collegeName,
         course, quota, allotted_category AS allottedCategory, remark,
         source_url AS sourceUrl, published_at AS publishedAt, verified_at AS verifiedAt,
         created_at AS createdAt, updated_at AS updatedAt
  FROM counselling_results
`;

function cleanTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp >= 0 ? Math.trunc(timestamp) : null;
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const url = new URL(request.url);
    const requestedAuthority = url.searchParams.get("authority") || "all";
    if (requestedAuthority !== "all" && !resultAuthority(requestedAuthority)) {
      return Response.json({ error: "Choose a valid counselling authority." }, { status: 400 });
    }
    const identifier = cleanCandidateIdentifier(url.searchParams.get("identifier"));
    const db = getD1();
    const [resultRows, releaseRows, countRows] = await Promise.all([
      db.prepare(`${RESULT_SELECT}
        WHERE (? = 'all' OR authority = ?)
          AND (? = '' OR candidate_identifier = ? OR neet_air = ?)
        ORDER BY COALESCE(published_at, verified_at) DESC, updated_at DESC
        LIMIT 250
      `).bind(requestedAuthority, requestedAuthority, identifier, identifier, identifier).all(),
      db.prepare(`
        SELECT id, authority, round_name AS roundName, title, source_url AS sourceUrl,
               revision_note AS revisionNote, published_at AS publishedAt,
               verified_at AS verifiedAt, created_at AS createdAt, updated_at AS updatedAt
        FROM counselling_result_releases
        ORDER BY COALESCE(published_at, verified_at) DESC, verified_at DESC
      `).all(),
      db.prepare(`
        SELECT authority, round_name AS roundName, COUNT(*) AS resultCount,
               MAX(verified_at) AS lastVerifiedAt
        FROM counselling_results GROUP BY authority, round_name
      `).all(),
    ]);
    const databaseResults = resultRows.results.map((row: Record<string, unknown>) => resultFromRow(row));
    const staticResults = OFFICIAL_RESULTS.filter((result) =>
      (requestedAuthority === "all" || result.authority === requestedAuthority)
      && (!identifier || cleanCandidateIdentifier(result.candidateIdentifier) === identifier || cleanCandidateIdentifier(result.neetAir) === identifier));
    const mergedResults = new Map<string, ReturnType<typeof resultFromRow>>();
    for (const result of staticResults) mergedResults.set(`${result.authority}:${result.roundName}:${result.candidateIdentifier}`, result);
    for (const result of databaseResults) mergedResults.set(`${result.authority}:${result.roundName}:${result.candidateIdentifier}`, result);

    const databaseReleases = releaseRows.results.map((row: Record<string, unknown>) => releaseFromRow(row));
    const mergedReleases = new Map<string, ResultRelease>();
    for (const release of OFFICIAL_RESULT_RELEASES) mergedReleases.set(`${release.authority}:${release.roundName}`, release);
    for (const release of databaseReleases) mergedReleases.set(`${release.authority}:${release.roundName}`, release);

    const counts = new Map<string, { resultCount: number; rounds: Set<string>; lastVerifiedAt: number | null }>();
    for (const result of OFFICIAL_RESULTS) {
      const current = counts.get(result.authority) ?? { resultCount: 0, rounds: new Set<string>(), lastVerifiedAt: null };
      current.resultCount += 1;
      current.rounds.add(result.roundName);
      current.lastVerifiedAt = Math.max(current.lastVerifiedAt ?? 0, result.verifiedAt);
      counts.set(result.authority, current);
    }
    for (const row of countRows.results as Record<string, unknown>[]) {
      const key = String(row.authority);
      const current = counts.get(key) ?? { resultCount: 0, rounds: new Set<string>(), lastVerifiedAt: null };
      current.resultCount += Number(row.resultCount ?? 0);
      current.rounds.add(String(row.roundName));
      current.lastVerifiedAt = Math.max(current.lastVerifiedAt ?? 0, Number(row.lastVerifiedAt ?? 0));
      counts.set(key, current);
    }
    const authorities = RESULT_AUTHORITIES.map((authority) => {
      const row = counts.get(authority.id);
      return {
        ...authority,
        resultCount: row?.resultCount ?? 0,
        roundCount: row?.rounds.size ?? 0,
        lastVerifiedAt: row?.lastVerifiedAt || null,
      };
    });
    const releases = [...mergedReleases.values()]
      .sort((a, b) => (b.publishedAt ?? b.verifiedAt) - (a.publishedAt ?? a.verifiedAt));
    const automaticLastVerifiedAt = OFFICIAL_RESULT_RELEASES.reduce<number | null>(
      (latest, release) => Math.max(latest ?? 0, release.verifiedAt) || null,
      null,
    );
    return Response.json({
      authorities,
      results: [...mergedResults.values()]
        .sort((a, b) => (b.publishedAt ?? b.verifiedAt) - (a.publishedAt ?? a.verifiedAt))
        .slice(0, 250),
      releases,
      sync: {
        active: true,
        cadenceMinutes: 60,
        lastVerifiedAt: automaticLastVerifiedAt,
        monitoredAuthorities: RESULT_AUTHORITIES.length,
        sourcePolicy: "official-only",
      },
      query: { authority: requestedAuthority, identifier },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load the official result desk." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = await request.json() as Record<string, unknown>;
    const authority = resultAuthority(payload.authority);
    const roundName = cleanResultText(payload.roundName, 120);
    const title = cleanResultText(payload.title, 180) || `${roundName} allotment result`;
    const sourceUrl = cleanResultText(payload.sourceUrl, 700);
    const revisionNote = cleanResultText(payload.revisionNote, 500);
    const publishedAt = cleanTimestamp(payload.publishedAt);
    const sourceRows = Array.isArray(payload.rows) ? payload.rows.slice(0, 200) : [];
    if (!authority || !roundName || !sourceUrl || !isOfficialResultUrl(authority, sourceUrl)) {
      return Response.json({ error: "Select a counselling and provide its official result link and round name." }, { status: 400 });
    }
    if (!sourceRows.length) return Response.json({ error: "No result rows were supplied." }, { status: 400 });

    const identifierTypes = new Set(["application_number", "registration_number", "neet_roll", "neet_air"]);
    const rows = sourceRows.flatMap((value) => {
      const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
      const neetAir = cleanCandidateIdentifier(row.neetAir);
      const candidateIdentifier = cleanCandidateIdentifier(row.candidateIdentifier) || neetAir;
      if (!candidateIdentifier) return [];
      const identifierType = identifierTypes.has(String(row.identifierType)) ? String(row.identifierType) : "application_number";
      return [{
        candidateIdentifier,
        identifierType,
        studentName: cleanResultText(row.studentName, 180),
        neetAir,
        collegeName: cleanResultText(row.collegeName, 400),
        course: cleanResultText(row.course, 100),
        quota: cleanResultText(row.quota, 160),
        allottedCategory: cleanResultText(row.allottedCategory, 120),
        remark: cleanResultText(row.remark, 240),
      }];
    });
    if (!rows.length) return Response.json({ error: "The selected identifier column contains no usable values." }, { status: 400 });

    const now = Date.now();
    const releaseId = `${authority}:${roundName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}`;
    const db = getD1();
    const statements = [
      db.prepare(`
        INSERT INTO counselling_result_releases (
          id, authority, round_name, title, source_url, revision_note,
          published_at, verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(authority, round_name) DO UPDATE SET
          title = excluded.title, source_url = excluded.source_url,
          revision_note = excluded.revision_note, published_at = excluded.published_at,
          verified_at = excluded.verified_at, updated_at = excluded.updated_at
      `).bind(releaseId, authority, roundName, title, sourceUrl, revisionNote || null, publishedAt, now, now, now),
      ...rows.map((row) => db.prepare(`
        INSERT INTO counselling_results (
          id, authority, round_name, candidate_identifier, identifier_type,
          student_name, neet_air, college_name, course, quota, allotted_category,
          remark, source_url, published_at, verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(authority, round_name, candidate_identifier) DO UPDATE SET
          identifier_type = excluded.identifier_type, student_name = excluded.student_name,
          neet_air = excluded.neet_air, college_name = excluded.college_name,
          course = excluded.course, quota = excluded.quota,
          allotted_category = excluded.allotted_category, remark = excluded.remark,
          source_url = excluded.source_url, published_at = excluded.published_at,
          verified_at = excluded.verified_at, updated_at = excluded.updated_at
      `).bind(
        crypto.randomUUID(), authority, roundName, row.candidateIdentifier, row.identifierType,
        row.studentName || null, row.neetAir || null, row.collegeName || null,
        row.course || null, row.quota || null, row.allottedCategory || null,
        row.remark || null, sourceUrl, publishedAt, now, now, now,
      )),
    ];
    await db.batch(statements);
    await recordAuditEvent(null, "admin", "official_results_imported", {
      authority, roundName, resultCount: rows.length, sourceUrl,
    });
    return Response.json({ ok: true, imported: rows.length, verifiedAt: now });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't import this official result file." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = await request.json() as { id?: unknown };
    const id = cleanResultText(payload.id, 120);
    if (!id) return Response.json({ error: "Choose a result record to remove." }, { status: 400 });
    const result = await getD1().prepare("DELETE FROM counselling_results WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return Response.json({ error: "That result record no longer exists." }, { status: 404 });
    await recordAuditEvent(null, "admin", "official_result_deleted", { resultId: id });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't remove this result record." }, { status: 500 });
  }
}
