import { glob } from "node:fs/promises";

/**
 * Scan a directory and return all module files in direct subdirectories
 * Pattern: dirPath/*\/{index}.{ts,js,mjs}
 */
export async function* scanModules(dirPath: string, index: string): AsyncGenerator<string> {
  const pattern = `${dirPath}/*/${index}.{ts,js,mjs}`;
  for await (const entry of glob(pattern)) {
    yield entry;
  }
}
