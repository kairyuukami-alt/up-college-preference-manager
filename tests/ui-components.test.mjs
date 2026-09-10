import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("requires every fixed profile field and subject mark before locking", async () => {
  const profileModule = await vite.ssrLoadModule("/lib/student-profile.ts");
  const empty = profileModule.emptyStudentProfile();
  assert.equal(profileModule.validateStudentProfile(empty).valid, false);

  for (const section of profileModule.PROFILE_SECTIONS) {
    for (const field of section.fields) {
      if (/Aadhaar/u.test(field.label)) empty.fields[field.key] = "123456789012";
      else if (/Mobile/u.test(field.label)) empty.fields[field.key] = "9876543210";
      else if (/PIN Code/u.test(field.label)) empty.fields[field.key] = "110001";
      else if (/Email/u.test(field.label)) empty.fields[field.key] = "student@example.com";
      else if (/Account Number/u.test(field.label)) empty.fields[field.key] = "123456789";
      else empty.fields[field.key] = field.options?.[0] ?? "Completed";
    }
  }
  for (const subject of [...empty.class10Subjects, ...empty.class12Subjects]) subject.obtained = "80";
  assert.deepEqual(profileModule.validateStudentProfile(empty), { valid: true, missing: [], invalid: [] });
});

test("identifies live official counselling events and excludes tentative dates from alerts", async () => {
  const schedules = await vite.ssrLoadModule("/lib/official-counselling-schedules.ts");
  const now = Date.parse("2026-09-05T22:40:00+05:30");
  const alerts = schedules.getAlertableScheduleEvents(now);

  assert.ok(alerts.some((item) => item.event.id === "mcc-r2-registration" && item.state === "ongoing"));
  assert.ok(alerts.some((item) => item.event.id === "mcc-r2-choices" && item.state === "ongoing"));
  assert.ok(alerts.every((item) => item.event.tentative !== true));

  const haryana = schedules.OFFICIAL_COUNSELLING_SCHEDULES.find((item) => item.id === "haryana");
  const verification = haryana.events.find((item) => item.id === "hr-r1-verification");
  assert.equal(schedules.getScheduleEventState(verification, now), "upcoming");
});
