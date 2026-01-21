import path from "node:path";
import type { App } from "../interfaces/index.js";
import { plugin } from "../plugin.js";
import { getRunningFilePath } from "../utils/fs.js";
import { importModule, tryImport } from "./importer.js";
import { scanModules as $scanModules } from "./scanner.js";
import type { ImportedModule, ModuleDiscoveryOptions } from "./types.js";

/**
 * Module discovery plugin
 * Uses Node.js's built-in import caching for performance
 */
export function moduleDiscovery(options: ModuleDiscoveryOptions) {
  const { index = "module", scanner = $scanModules, root: modulesPath = getRunningFilePath() } = options;

  async function loadModules(app: App, current: ImportedModule): Promise<void> {
    app.register(async function unknown(child: App, opts: any) {
      current.meta.plugins?.forEach((x) => child.register(x));

      if (current.module) {
        await current.module(child, opts);
      }
      // Scan and load child modules
      for await (const entry of scanner(current.dir, index)) {
        await loadModules(child, await importModule(entry));
      }
    }, current.meta);
  }

  return plugin(async function moduleDiscovery(app) {
    const root = await tryImport(path.join(modulesPath, index));
    if (root) {
      root.meta = { name: "root", ...root.meta };
      await loadModules(app, root);
      return;
    }

    for await (const entry of scanner(modulesPath, index)) {
      await loadModules(app, await importModule(entry));
    }
  });
}
