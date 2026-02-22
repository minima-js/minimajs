/**
 * Scan a directory and return all module files in direct subdirectories
 * Pattern: dirPath/*\/{index}.{ts,js,mjs}
 */
export async function* scanModules(pattern: string): AsyncGenerator<string> {
  const { glob } = await import("node:fs/promises");
  for await (const entry of glob(pattern)) {
    yield entry;
  }
}
