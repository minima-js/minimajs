import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ImportedModule, Meta } from "./types.js";

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

/**
 * Try to import a module, trying different extensions
 * Node.js will cache successful imports automatically
 */
export async function importModule(modulePath: string, def?: Meta): Promise<ImportedModule | null> {
  const moduleName = path.basename(modulePath);

  for (let i = 0; i < tryExt.length; i++) {
    const ext = tryExt[i]!;
    const filePath = path.join(modulePath, "module" + ext);

    try {
      const url = pathToFileURL(filePath);
      const { default: module, meta } = await import(url.href);

      // Move successful extension to front for next time
      moveToFront(tryExt, i);

      return {
        module,
        meta: { prefix: "/" + moduleName, name: moduleName, ...def, ...meta },
      };
    } catch (error: any) {
      // Only ignore "file not found" errors, throw others
      if (error?.code !== "ERR_MODULE_NOT_FOUND" && error?.code !== "MODULE_NOT_FOUND") {
          throw error;
      }
      // File not found, try next extension
    }
  }

  // No module file found
  if (def) {
    return { meta: { name: moduleName, prefix: `/${moduleName}`, ...def } };
  }
  return null;
}
