import type { App } from "../interfaces/index.js";
import { plugin } from "../plugin.js";
import { getRunningFilePath } from "../utils/fs.js";
import { importModule } from "./importer.js";
import { scanDirectory } from "./scanner.js";
import type { Meta, ModuleDiscoveryOptions } from "./types.js";

export * from "./types.js";

/**
 * Module discovery plugin
 * Uses Node.js's built-in import caching for performance
 */
export function moduleDiscovery(options: ModuleDiscoveryOptions) {
  const modulesPath = options.modulesPath ?? getRunningFilePath();

  async function loadModules(app: App, current: string, meta?: Meta): Promise<void> {
    // Import module (Node.js caches this automatically)
    const imported = await importModule(current, meta);

    if (!imported) {
      // No module found and no default meta - stop here
      return;
    }

    app.register(async function dummyModule(child: App, opts: any) {
      if (imported.module) {
        await imported.module(child, opts);
      }
      // Scan and load child modules
      for await (const entry of scanDirectory(current)) {
        await loadModules(child, entry.path);
      }
    }, imported.meta);
  }

  return plugin(function moduleDiscovery(app) {
    return loadModules(app, modulesPath, {
      prefix: "",
      name: options.name,
    },
    );
  });
}
