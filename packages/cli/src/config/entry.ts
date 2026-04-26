import { logger } from "#/utils/logger.js";
import { glob } from "node:fs/promises";

const GLOB_CHARS = /[*?{[]/;

function isGlobPattern(s: string): boolean {
  return GLOB_CHARS.test(s);
}

/**
 * Resolves the full list of entry points for the build.
 * Each element of `entries` is either:
 *   - a static file path (e.g. "src/index.ts")
 *   - a glob pattern   (e.g. "src/** /module.{ts,js}", "src/** /cron.ts")
 */
export async function resolveEntries(entries: string[]): Promise<string[]> {
  const resolved: string[] = [];

  for (const entry of entries) {
    if (isGlobPattern(entry)) {
      for await (const file of glob(entry)) {
        resolved.push(file);
      }
    } else {
      resolved.push(entry);
    }
  }

  if (resolved.length === 0) {
    logger.fatal(`No entry points found. Checked: ${entries.map((e) => `"${e}"`).join(", ")}.`);
  }

  return resolved;
}
