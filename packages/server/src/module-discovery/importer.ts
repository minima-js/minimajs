import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ImportedModule } from "./types.js";

// Ordered by likelihood: TypeScript first (common in modern projects), then JS variants
// This array will be reordered based on successful matches for optimization
const tryExt = [".ts", ".js", ".mjs", ""];

/**
 * Moves an element from a given index to the front of the array (index 0)
 * Mutates the array in place for performance
 */
function moveToFront<T>(arr: T[], index: number): void {
  if (index === 0) return;
  [arr[0], arr[index]] = [arr[index]!, arr[0]!];
}

export async function tryImport(modulePath: string): Promise<ImportedModule | null> {
  for (let i = 0; i < tryExt.length; i++) {
    const ext = tryExt[i]!;
    const filePath = modulePath + ext;
    try {
      const url = pathToFileURL(filePath);
      const { default: module, meta } = await import(url.href);
      moveToFront(tryExt, i);
      return {
        dir: path.dirname(modulePath),
        module: typeof module === "function" ? module : undefined,
        meta,
      };
    } catch (error: any) {
      // Only ignore "file not found" errors, throw others
      if (error?.code !== "ERR_MODULE_NOT_FOUND" && error?.code !== "MODULE_NOT_FOUND") {
        throw error;
      }
    }
  }
  return null;
}

/**
 * Try to import a module, trying different extensions
 * Node.js will cache successful imports automatically
 */
export async function importModule(modulePath: string): Promise<ImportedModule> {
  const dir = path.dirname(modulePath);
  const moduleName = path.basename(dir);
  const url = pathToFileURL(modulePath);
  const { default: module, meta } = await import(url.href);

  return {
    dir,
    module: typeof module === "function" ? module : undefined,
    meta: { name: moduleName, prefix: `/${moduleName}`, ...meta },
  };
}
