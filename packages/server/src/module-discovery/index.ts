import path from "node:path";
import type { App } from "../interfaces/index.js";
import { plugin } from "../plugin.js";
import { getRunningFilePath } from "../utils/fs.js";
import { importModule, tryImport } from "./importer.js";
import { scanModules } from "./scanner.js";
import type { ImportedModule, ModuleDiscoveryOptions } from "./types.js";

/**
 * Module discovery plugin
 * Uses Node.js's built-in import caching for performance
 */
export function moduleDiscovery(options: ModuleDiscoveryOptions) {
  const modulesPath = options.modulesPath ?? getRunningFilePath();
  async function loadModules(app: App, current: ImportedModule): Promise<void> {
    app.register(async function dummyModule(child: App, opts: any) {
      if (current.module) {
        await current.module(child, opts);
      }
      // Scan and load child modules
      for await (const entry of scanModules(current.dir)) {
        await loadModules(child, await importModule(entry));
      }
    }, current.meta);
  }

  return plugin(async function moduleDiscovery(app) {
    const rootModule = await tryImport(path.join(modulesPath, "module"));
    if (rootModule) {
      rootModule.meta = { name: options.name, ...rootModule.meta };
      await loadModules(app, rootModule);
      return;
    }

    for await (const entry of scanModules(modulesPath)) {
      await loadModules(app, await importModule(entry));
    }
  });
}
