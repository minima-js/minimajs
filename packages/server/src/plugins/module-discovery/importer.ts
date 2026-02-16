import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ImportedModule } from "./types.js";

/**
 * Try to import a module, trying different extensions
 * Node.js will cache successful imports automatically
 */
export async function importModule(modulePath: string, isRoot = false): Promise<ImportedModule> {
  const dir = path.dirname(modulePath);
  const url = pathToFileURL(modulePath);
  const { default: module, meta = {}, routes }: ImportedModule = await import(url.href);

  if (isRoot) {
    meta.name ??= "root";
  } else {
    const moduleName = path.basename(dir);
    meta.name ??= moduleName;
    meta.prefix ??= `/${moduleName}`;
  }

  return {
    default: typeof module === "function" ? module : undefined,
    routes,
    dir,
    meta,
  };
}

export async function importRootModule(results: AsyncIterable<string>) {
  for await (const mod of results) {
    return importModule(mod, true);
  }
  return null;
}
