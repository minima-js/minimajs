import { EOL } from "node:os";
import { type App } from "../../interfaces/index.js";
import { hook } from "../../hooks/index.js";
import { setTimeout as sleep } from "node:timers/promises";
import type { RouteConfig } from "../../interfaces/route.js";
import { kModuleName } from "../../symbols.js";

/**
 * Returns a formatted string grouping routes by module name, using a tree structure.
 *
 * @example
 * ```
 * (root)
 * └── GET    /health
 *
 * users
 * ├── GET    /users
 * ├── POST   /users
 * └── GET    /users/:id
 * ```
 */
export function prettyPrintByModule(app: App): string {
  const rawRoutes = (app.router as any).routes as Array<{
    method: string;
    path: string;
    store: RouteConfig<any>;
  }>;

  const groups = new Map<string, Array<{ method: string; path: string }>>();

  for (const { method, path, store } of rawRoutes) {
    const name = (store.app.container[kModuleName] as string | undefined) ?? "(root)";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push({ method, path });
  }

  const lines: string[] = [];
  for (const [name, routes] of groups) {
    lines.push(name);
    for (let i = 0; i < routes.length; i++) {
      const { method, path } = routes[i];
      const isLast = i === routes.length - 1;
      lines.push(`${isLast ? "└──" : "├──"} ${method.padEnd(7)} ${path}`);
    }
    lines.push("");
  }

  return lines.join(EOL).trimEnd();
}

export interface RouteLoggerOptions {
  enabled?: boolean;
  /** Custom logger function to output routes. Defaults to console.log with magenta color */
  logger?: (message: string) => void;
  /** Whether to print routes with common prefix removed for cleaner output. Defaults to false */
  commonPrefix?: boolean;
  /** Group routes by module name instead of path hierarchy. Defaults to false */
  groupByModule?: boolean;
  delay?: number; // logs are async, if route list is long, this might override other logs, causing delay can prevent overlapping.
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
export function routeLogger({ enabled, delay = 1, commonPrefix = false, logger }: RouteLoggerOptions = {}) {
  if (enabled === false) {
    return hook.factory((hooks, app) => {
      hooks.ready.delete(app.$root.container[kRouteLogger] as any);
    });
  }

  function onReady(app: App) {
    logger ??= (routes) => app.log.info(EOL + routes);
    logger(app.router.prettyPrint({ commonPrefix }));
    return sleep(delay); // give some space for other loggers
  }

  return hook.factory((hooks, app) => {
    hooks.ready.delete(app.$root.container[kRouteLogger] as any);
    app.$root.container[kRouteLogger] = onReady;
    hooks.ready.add(onReady);
  });
}
