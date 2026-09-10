import { getD1 } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { BUILTIN_MASTER, type MasterValue } from "@/lib/master-data";
import { requireAdmin } from "@/lib/portal-auth";

type UploadRow = Record<string, MasterValue>;

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "We couldn't access the counselling master lists. Please try again." },
    { status: 500 },
  );
}

function cleanValue(value: unknown): MasterValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).trim();
}

function preferenceNumber(value: MasterValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const result = await getD1()
      .prepare(`
        SELECT m.id, m.title, m.source_filename AS sourceFilename,
               m.columns_json AS columnsJson, m.college_name_key AS collegeNameKey,
               m.preference_key AS preferenceKey, m.updated_at AS updatedAt,
               COUNT(c.id) AS collegeCount
        FROM counselling_masters m
        LEFT JOIN master_colleges c ON c.master_id = m.id
        GROUP BY m.id
        ORDER BY m.updated_at DESC, m.title COLLATE NOCASE ASC
      `)
      .all();

    const uploaded = result.results.map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      sourceFilename: row.sourceFilename,
      columns: JSON.parse(String(row.columnsJson)),
      collegeNameKey: row.collegeNameKey,
      preferenceKey: row.preferenceKey,
      updatedAt: row.updatedAt,
      collegeCount: Number(row.collegeCount),
      builtin: false,
    }));
    return Response.json({ masters: [BUILTIN_MASTER, ...uploaded] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let createdId: string | null = null;
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = (await request.json()) as {
      title?: string;
      sourceFilename?: string;
      columns?: unknown;
      collegeNameKey?: string;
      preferenceKey?: string | null;
      rows?: unknown;
    };
    const title = payload.title?.trim() ?? "";
    const sourceFilename = payload.sourceFilename?.trim() ?? "Uploaded workbook.xlsx";
    const columns = Array.isArray(payload.columns)
      ? [...new Set(payload.columns.map((column) => String(column).trim()).filter(Boolean))]
      : [];
    const collegeNameKey = payload.collegeNameKey?.trim() ?? "";
    const preferenceKey = payload.preferenceKey?.trim() || null;

    if (!title || title.length > 120) {
      return Response.json({ error: "Enter a valid counselling list name." }, { status: 400 });
    }
    if (!columns.length || columns.length > 50 || !columns.includes(collegeNameKey)) {
      return Response.json({ error: "Choose the column that contains the college name." }, { status: 400 });
    }
    if (preferenceKey && !columns.includes(preferenceKey)) {
      return Response.json({ error: "The preference order column is invalid." }, { status: 400 });
    }
    if (!Array.isArray(payload.rows) || payload.rows.length < 1 || payload.rows.length > 2000) {
      return Response.json({ error: "The selected sheet must contain between 1 and 2,000 colleges." }, { status: 400 });
    }

    const rows = payload.rows
      .map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return null;
        const source = row as Record<string, unknown>;
        const clean: UploadRow = {};
        for (const column of columns) clean[column] = cleanValue(source[column]);
        return String(clean[collegeNameKey] ?? "").trim() ? clean : null;
      })
      .filter((row): row is UploadRow => Boolean(row));

    if (!rows.length) {
      return Response.json({ error: "No college names were found in the selected column." }, { status: 400 });
    }
    if (rows.some((row) => JSON.stringify(row).length > 50_000)) {
      return Response.json({ error: "One or more spreadsheet rows are too large to import." }, { status: 400 });
    }
    if (preferenceKey) {
      rows.sort((a, b) => preferenceNumber(a[preferenceKey]) - preferenceNumber(b[preferenceKey]));
    }

    const db = getD1();
    const id = crypto.randomUUID();
    createdId = id;
    const now = Date.now();
    await db.prepare(
      "INSERT INTO counselling_masters (id, title, source_filename, columns_json, college_name_key, preference_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, title, sourceFilename.slice(0, 240), JSON.stringify(columns), collegeNameKey, preferenceKey, now, now).run();

    for (let start = 0; start < rows.length; start += 75) {
      const batch = rows.slice(start, start + 75).map((row, index) =>
        db.prepare("INSERT INTO master_colleges (master_id, position, data_json) VALUES (?, ?, ?)")
          .bind(id, start + index + 1, JSON.stringify(row)),
      );
      await db.batch(batch);
    }

    await recordAuditEvent(null, "admin", "counselling_master_uploaded", { masterId: id, title, collegeCount: rows.length });

    return Response.json({
      master: {
        id,
        title,
        sourceFilename,
        columns,
        collegeNameKey,
        preferenceKey,
        updatedAt: now,
        collegeCount: rows.length,
        builtin: false,
      },
    }, { status: 201 });
  } catch (error) {
    if (createdId) {
      try {
        const db = getD1();
        await db.batch([
          db.prepare("DELETE FROM master_colleges WHERE master_id = ?").bind(createdId),
          db.prepare("DELETE FROM counselling_masters WHERE id = ?").bind(createdId),
        ]);
      } catch (cleanupError) {
        console.error(cleanupError);
      }
    }
    return errorResponse(error);
  }
}
