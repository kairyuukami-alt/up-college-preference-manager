import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("student profile endpoints derive identity from the authenticated session", async () => {
  const routes = [
    "app/api/student/list/route.ts",
    "app/api/student/progress/route.ts",
    "app/api/student/profile/route.ts",
    "app/api/student/profile/lock/route.ts",
    "app/api/student/profile/documents/route.ts",
    "app/api/student/profile/documents/[documentId]/route.ts",
  ];
  for (const route of routes) {
    const source = await readFile(path.join(root, route), "utf8");
    assert.match(source, /requireStudent\(request\)/u);
    assert.match(source, /session\.listId/u);
    assert.doesNotMatch(source, /params:\s*Promise<\{\s*id:/u);
  }
});

test("new counselling administration routes require an administrator session", async () => {
  const routes = [
    "app/api/admin/dashboard/route.ts",
    "app/api/admin/results/route.ts",
    "app/api/lists/[id]/status/route.ts",
    "app/api/lists/[id]/versions/route.ts",
    "app/api/lists/[id]/profile/documents/download/route.ts",
    "app/api/masters/[id]/requirements/route.ts",
    "app/api/masters/[id]/deadlines/route.ts",
  ];
  for (const route of routes) {
    const source = await readFile(path.join(root, route), "utf8");
    assert.match(source, /requireAdmin\(request\)/u, `${route} must require an administrator session`);
  }
});

test("profile locking is blocked until every required document is accepted", async () => {
  for (const route of ["app/api/student/profile/lock/route.ts", "app/api/lists/[id]/profile/lock/route.ts"]) {
    const source = await readFile(path.join(root, route), "utf8");
    assert.match(source, /checklistReady/u);
    assert.match(source, /must be accepted before locking/u);
  }
});

test("locked profile deletion verifies the administrator password and removes stored files", async () => {
  const source = await readFile(path.join(root, "app/api/lists/[id]/route.ts"), "utf8");
  assert.match(source, /profileLockedAt/u);
  assert.match(source, /passwordsMatch/u);
  assert.match(source, /getR2\(\)\.delete\(objectKeys\)/u);
  assert.match(source, /student_profile_deleted/u);
});

test("preference saves preserve recoverable versions and audit changes", async () => {
  for (const route of ["app/api/lists/[id]/route.ts", "app/api/student/list/route.ts"]) {
    const source = await readFile(path.join(root, route), "utf8");
    assert.match(source, /savePreferenceVersion/u);
    assert.match(source, /preference_list_saved/u);
  }
});

test("student first-time password setup routes are removed", async () => {
  await assert.rejects(access(path.join(root, "app/api/auth/student/setup/route.ts")));
  await assert.rejects(access(path.join(root, "app/api/lists/[id]/setup-code/route.ts")));
});

test("student PIN hashing stays within the Cloudflare PBKDF2 limit", async () => {
  const source = await readFile(path.join(root, "lib/portal-auth.ts"), "utf8");
  const match = source.match(/const PASSWORD_ITERATIONS = ([\d_]+);/u);
  assert.ok(match, "PASSWORD_ITERATIONS must be defined");
  assert.ok(Number(match[1].replaceAll("_", "")) <= 100_000);
});

test("counselling question inbox operations require an administrator session", async () => {
  const collectionRoute = await readFile(path.join(root, "app/api/questions/route.ts"), "utf8");
  const itemRoute = await readFile(path.join(root, "app/api/questions/[id]/route.ts"), "utf8");

  assert.match(collectionRoute, /export async function GET[\s\S]*requireAdmin\(request\)/u);
  assert.match(collectionRoute, /export async function POST/u);
  assert.match(itemRoute, /export async function PATCH[\s\S]*requireAdmin\(request\)/u);
  assert.match(itemRoute, /export async function DELETE[\s\S]*requireAdmin\(request\)/u);
});

test("counselling questions expire and are deleted after seven days", async () => {
  const source = await readFile(path.join(root, "app/api/questions/route.ts"), "utf8");
  assert.match(source, /QUESTION_RETENTION_MS = 7 \* 24 \* 60 \* 60 \* 1_000/u);
  assert.match(source, /DELETE FROM counselling_questions WHERE created_at <= \?/u);
  assert.match(source, /WHERE created_at > \?/u);
});
