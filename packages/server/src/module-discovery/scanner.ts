import { glob } from "node:fs/promises";

export interface DirectoryEntry {
  name: string;
  path: string;
}

/**
 * Scan a directory and return all subdirectories
 */
export async function* scanModules(dirPath: string, index: string): AsyncGenerator<string> {
  const pattern = `${dirPath}/*/${index}.{ts,js,mjs}`;
  for await (const entry of glob(dirPath + pattern)) {
    yield entry;
  }
}
