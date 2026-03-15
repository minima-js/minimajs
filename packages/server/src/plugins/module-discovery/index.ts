import type { App } from "../../interfaces/index.js";
import { plugin } from "../../plugin.js";
import { getRunningFilePath } from "../../utils/fs.js";
import { importModule, importRootModule } from "./importer.js";
import { scanModules } from "./scanner.js";
import type { ImportedModule, ModuleDiscoveryOptions, Routes } from "./types.js";
import type { HTTPMethod } from "find-my-way";

import { getHandlerDescriptors } from "../../internal/route.js";
import { kRouteMeta } from "../../symbols.js";

function addRoutes(app: App, routes: Routes) {
  for (const [route, handler] of Object.entries(routes)) {
    const [method, path] = route.split(" ") as [HTTPMethod, string];
    const descriptors = getHandlerDescriptors(handler);
    app.route({ method, path }, ...descriptors, handler);
  }
}

/**
 * Module discovery plugin
 * Uses Node.js's built-in import caching for performance
 */
export function moduleDiscovery(options: ModuleDiscoveryOptions) {
  const { index = "module.{ts,js}", scanner = scanModules, root: modulesPath = getRunningFilePath() } = options;

  async function loadModules(app: App, current: ImportedModule): Promise<void> {
    app.register(async function unknown(child: App, opts: any) {
      child.container[kRouteMeta] = current.meta;
      current.meta.plugins?.forEach((x) => child.register(x));
      if (current.routes) {
        addRoutes(child, current.routes);
      }

      if (current.default) {
        await current.default(child, opts);
      }
      // Scan and load child modules
      for await (const entry of scanner(`${current.dir}/*/${index}`)) {
        await loadModules(child, await importModule(entry));
      }
    }, current.meta);
  }

  return plugin(async function moduleDiscovery(app) {
    const root = await importRootModule(scanner(`${modulesPath}/${index}`));
    if (root) {
      await loadModules(app, root);
      return;
    }

    for await (const entry of scanner(`${modulesPath}/*/${index}`)) {
      await loadModules(app, await importModule(entry));
    }
  });
}
