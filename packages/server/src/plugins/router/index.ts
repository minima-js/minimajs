import { EOL } from "node:os";
import { type App } from "../../interfaces/index.js";
import { hook } from "../../hooks/index.js";
import { setTimeout as sleep } from "node:timers/promises";
import { prettyPrintByModule, routesToJSON } from "./grouping.js";
import { isLoggerPretty } from "../../logger.js";
export { prettyPrintByModule };

export interface RouteLoggerOptions {
  enabled?: boolean;
  /** Custom logger function to output routes. Defaults to app.logger.info */
  logger?: (message: string) => void;
  /** Force pretty (ASCII tree) or JSON output, overriding the logger's detected format */
  pretty?: boolean;
  /**
   * How to group and display routes:
   * - `"path"` — flat list ordered by path (default)
   * - `"common"` — tree grouped by common path prefix
   * - `"module"` — tree grouped by module name
   */
  groupBy?: "path" | "common" | "module";
  delay?: number; // logs are async, if route list is long, this might override other logs, causing delay can prevent overlapping.
}
const kRouteLogger = Symbol();

/**
 * Displays a formatted list of all registered routes on app ready.
 *
 * @example
 * ```typescript
 * import { createApp } from "@minimajs/server";
 * import { routeLogger } from "@minimajs/server/plugins";
 *
 * const app = createApp();
 *
 * app.register(routeLogger());
 * app.register(routeLogger({ groupBy: "module" }));
 * app.register(routeLogger({ groupBy: "common" }));
 * ```
 */
export function routeLogger({ enabled, delay = 1, groupBy = "module", logger, pretty: _pretty }: RouteLoggerOptions = {}) {
  if (enabled === false) {
    return hook.factory((hooks, app) => {
      hooks.ready.delete(app.$root.container[kRouteLogger] as any);
    });
  }

  function buildText(app: App) {
    return groupBy === "module" ? prettyPrintByModule(app) : app.router.prettyPrint({ commonPrefix: groupBy === "common" });
  }

  function onReady(app: App) {
    const pretty = _pretty ?? isLoggerPretty(app.$root.logger);
    if (pretty || logger) {
      const text = buildText(app);
      logger ? logger(text) : app.logger.info(EOL + text + EOL);
    } else {
      app.logger.info({ routes: routesToJSON(app) }, "registered routes");
    }
    return sleep(delay);
  }

  return hook.factory((hooks, app) => {
    hooks.ready.delete(app.$root.container[kRouteLogger] as any);
    app.$root.container[kRouteLogger] = onReady;
    hooks.ready.add(onReady);
  });
}
