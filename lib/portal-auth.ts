import { getD1 } from "@/db";

const SESSION_COOKIE = "vidyasaarthi_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_ATTEMPTS = 5;
// Cloudflare Workers supports PBKDF2 iteration counts up to 100,000.
const PASSWORD_ITERATIONS = 100_000;

export type PortalSession = {
  id: string;
  role: "admin" | "student";
  listId: string | null;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  const normalised = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export function sessionCookie(token: string, maxAge = Math.floor(SESSION_DURATION_MS / 1000)) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createPortalSession(role: PortalSession["role"], listId: string | null = null) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;
  const db = getD1();
  await db.batch([
    db.prepare("DELETE FROM portal_sessions WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM auth_attempts WHERE updated_at <= ?").bind(now - RATE_LIMIT_WINDOW_MS),
  ]);
  await db.prepare(
    "INSERT INTO portal_sessions (id, role, list_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(token, role, listId, now, expiresAt).run();
  return { token, expiresAt };
}

export async function getPortalSession(request: Request): Promise<PortalSession | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await getD1().prepare(
    "SELECT id, role, list_id AS listId, expires_at AS expiresAt FROM portal_sessions WHERE id = ?",
  ).bind(token).first();
  if (!row || (row.role !== "admin" && row.role !== "student")) return null;
  if (Number(row.expiresAt) <= Date.now()) {
    await getD1().prepare("DELETE FROM portal_sessions WHERE id = ?").bind(token).run();
    return null;
  }
  return {
    id: String(row.id),
    role: row.role,
    listId: row.listId ? String(row.listId) : null,
    expiresAt: Number(row.expiresAt),
  };
}

export async function deletePortalSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await getD1().prepare("DELETE FROM portal_sessions WHERE id = ?").bind(token).run();
}

export async function requireAdmin(request: Request) {
  const session = await getPortalSession(request);
  if (session?.role === "admin") return null;
  return Response.json({ error: "Admin access is required." }, { status: 401 });
}

export async function requireStudent(request: Request): Promise<PortalSession | Response> {
  const session = await getPortalSession(request);
  if (session?.role === "student" && session.listId) return session;
  return Response.json({ error: "Student access is required." }, { status: 401 });
}

export async function passwordsMatch(input: string, expected: string) {
  const [left, right] = await Promise.all([sha256(input), sha256(expected)]);
  return constantTimeEqual(left, right);
}

export function isValidStudentPassword(password: string) {
  return password.length >= 4 && password.length <= 32 && !/\s/u.test(password);
}

export async function hashStudentPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    hash: bytesToBase64Url(await derivePassword(password, salt)),
    salt: bytesToBase64Url(salt),
  };
}

async function derivePassword(password: string, salt: Uint8Array) {
  const stableSalt = new Uint8Array(salt.byteLength);
  stableSalt.set(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: stableSalt, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function verifyStudentPassword(password: string, storedHash: string, storedSalt: string) {
  try {
    const actual = await derivePassword(password, base64UrlToBytes(storedSalt));
    return constantTimeEqual(actual, base64UrlToBytes(storedHash));
  } catch {
    return false;
  }
}

async function rateLimitKey(request: Request, scope: string) {
  const forwarded = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  return bytesToBase64Url(await sha256(`${scope}:${forwarded}`));
}

export async function checkRateLimit(request: Request, scope: string) {
  const key = await rateLimitKey(request, scope);
  const row = await getD1().prepare(
    "SELECT attempts, window_start AS windowStart FROM auth_attempts WHERE key = ?",
  ).bind(key).first();
  const now = Date.now();
  if (!row || now - Number(row.windowStart) >= RATE_LIMIT_WINDOW_MS) return null;
  if (Number(row.attempts) < RATE_LIMIT_ATTEMPTS) return null;
  const retryAfter = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - Number(row.windowStart))) / 1000));
  return Response.json(
    { error: "Too many attempts. Please wait before trying again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function recordFailedAttempt(request: Request, scope: string) {
  const key = await rateLimitKey(request, scope);
  const now = Date.now();
  const existing = await getD1().prepare(
    "SELECT attempts, window_start AS windowStart FROM auth_attempts WHERE key = ?",
  ).bind(key).first();
  const withinWindow = existing && now - Number(existing.windowStart) < RATE_LIMIT_WINDOW_MS;
  const attempts = withinWindow ? Number(existing.attempts) + 1 : 1;
  const windowStart = withinWindow ? Number(existing.windowStart) : now;
  await getD1().prepare(`
    INSERT INTO auth_attempts (key, attempts, window_start, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET attempts = excluded.attempts,
      window_start = excluded.window_start, updated_at = excluded.updated_at
  `).bind(key, attempts, windowStart, now).run();
}

export async function clearFailedAttempts(request: Request, scope: string) {
  const key = await rateLimitKey(request, scope);
  await getD1().prepare("DELETE FROM auth_attempts WHERE key = ?").bind(key).run();
}
