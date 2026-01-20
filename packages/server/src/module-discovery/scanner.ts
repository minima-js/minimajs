import { opendir } from "node:fs/promises";
import path from "node:path";

export interface DirectoryEntry {
  name: string;
  path: string;
}

/**
 * Scan a directory and return all subdirectories
 */
export async function* scanDirectory(dirPath: string): AsyncGenerator<DirectoryEntry> {
  for await (const entry of await opendir(dirPath)) {
    // Skip node_modules, hidden dirs (starting with .), private dirs (starting with _), and symlinks
    if (
      entry.name === "node_modules" ||
      entry.name.startsWith(".") ||
      entry.name.startsWith("_") ||
      entry.isSymbolicLink()
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      yield {
        name: entry.name,
        path: path.join(dirPath, entry.name),
      };
    }
  }
}
