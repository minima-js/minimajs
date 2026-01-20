import { glob } from "node:fs/promises";

export interface DirectoryEntry {
  name: string;
  path: string;
}

/**
 * Scan a directory and return all subdirectories
 */
export async function* scanModules(dirPath: string, pattern = "/*/module.{ts,js,mjs}"): AsyncGenerator<string> {
  for await (const entry of glob(dirPath + pattern)) {
    yield entry;
  }
}
