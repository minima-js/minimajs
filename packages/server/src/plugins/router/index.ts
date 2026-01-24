import { EOL } from "node:os";
import { type App } from "../../interfaces/index.js";
import { hook } from "../../hooks/index.js";

export interface RouteLoggerOptions {
  enabled?: boolean;
  /** Custom logger function to output routes. Defaults to console.log with magenta color */
  logger?: (message: string) => void;
  /** Whether to print routes with common prefix removed for cleaner output. Defaults to false */
  commonPrefix?: boolean;
}
const kRouteLogger = Symbol();

/**
 * Displays a formatted tree of all routes with their HTTP methods and paths.
 * Useful for debugging and understanding the application's route structure during development.
 *
 * @param options - Configuration options for route logging
 * @param options.logger - Custom logger function (default: console.log with magenta color)
 * @param options.commonPrefix - Whether to remove common prefix from routes (default: false)
 *
 *
 * @example
 * ```typescript
 * import { createApp } from "@minimajs/server";
 * import { routeLogger } from "@minimajs/server/plugins";
 *
 * const app = createApp();
 *
 * // With default settings
 * app.register(routeLogger());
 *
 * // With custom logger
 * app.register(routeLogger({
 *   logger: (routes) => console.log("Routes:\n", routes)
 * }));
 *
 * // With common prefix removed
 * app.register(routeLogger({ commonPrefix: false  }));
 * ```
 */
export function routeLogger({ enabled, commonPrefix = false, logger }: RouteLoggerOptions = {}) {
  if (enabled === false) {
    return hook.factory((hooks, app) => {
      hooks.ready.delete(app.$root.container[kRouteLogger] as any);
    });
  }

  function onReady(app: App) {
    logger ??= (routes) => app.log.info(EOL + routes);
    logger(app.router.prettyPrint({ commonPrefix }));
  }

  return hook.factory((hooks, app) => {
    hooks.ready.delete(app.$root.container[kRouteLogger] as any);
    app.$root.container[kRouteLogger] = onReady;
    hooks.ready.add(onReady);
  });
}
