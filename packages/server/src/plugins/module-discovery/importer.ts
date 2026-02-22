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
  const module: ImportedModule = { meta: {}, ...(await import(url.href)), dir };

  if (typeof module.default !== "function") {
    module.default = undefined;
  }

  if (isRoot) {
    module.meta.name ??= "root";
  } else {
    const moduleName = path.basename(dir);
    module.meta.name ??= moduleName;
    module.meta.prefix ??= `/${moduleName}`;
  }
  return module;
}

export async function importRootModule(results: AsyncIterable<string>) {
  for await (const mod of results) {
    return importModule(mod, true);
  }
  return null;
}
