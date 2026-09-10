import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const runtimeEnv = env as unknown as Record<string, unknown> & {
  DB?: D1Database;
  BUCKET?: R2Bucket;
};

export function getDb() {
  return drizzle(getD1(), { schema });
}

export function getD1() {
  if (!runtimeEnv.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return runtimeEnv.DB;
}

export function getR2() {
  if (!runtimeEnv.BUCKET) {
    throw new Error(
      "Cloudflare R2 binding `BUCKET` is unavailable. Set the `r2` field in .openai/hosting.json to `BUCKET` before using profile documents.",
    );
  }
  return runtimeEnv.BUCKET;
}

export function getRuntimeValue(key: string) {
  const value = runtimeEnv[key];
  return typeof value === "string" ? value : undefined;
}
