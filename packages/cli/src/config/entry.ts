import { existsSync } from "node:fs";
import { glob } from "node:fs/promises";

/**
 * Resolves the full list of entry points for the build:
 * - The primary entry (e.g. src/index.ts)
 * - All files matching modulePattern (e.g. src/** /module.ts) as individual entries
 *   so their directory structure is preserved in the output via `outbase`.
 */
export async function resolveEntries(entry: string, modulePattern: string): Promise<string[]> {
  const entries: string[] = [];

  if (existsSync(entry)) {
    entries.push(entry);
  }

  for await (const file of glob(modulePattern)) {
    // Avoid duplicating the primary entry if it matches the pattern
    if (file !== entry && !entries.includes(file)) {
      entries.push(file);
    }
  }

  if (entries.length === 0) {
    throw new Error(`No entry points found. Expected "${entry}" to exist, or files matching "${modulePattern}".`);
  }

  return entries;
}
