import { existsSync } from "node:fs";
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
        if (!resolved.includes(file)) {
          resolved.push(file);
        }
      }
    } else {
      if (existsSync(entry) && !resolved.includes(entry)) {
        resolved.push(entry);
      }
    }
  }

  if (resolved.length === 0) {
    throw new Error(
      `No entry points found. Checked: ${entries.map((e) => `"${e}"`).join(", ")}.`
    );
  }

  return resolved;
}
