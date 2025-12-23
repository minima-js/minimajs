import chalk from "chalk";
import { plugin } from "../internal/plugins.js";

export interface RouteLoggerOptions {
  /** Custom logger function to output routes. Defaults to console.log with magenta color */
  logger?: (message: string) => void;
  /** Whether to print routes with common prefix removed for cleaner output. Defaults to false */
  commonPrefix?: boolean;
}

function defaultLogger(routes: string) {
  console.log(chalk.magenta(routes));
}

/**
 * Creates a Fastify plugin that logs all registered routes when the server is ready.
 *
 * Displays a formatted tree of all routes with their HTTP methods and paths.
 * Useful for debugging and understanding the application's route structure during development.
 *
 * @param options - Configuration options for route logging
 * @param options.logger - Custom logger function (default: console.log with magenta color)
 * @param options.commonPrefix - Whether to remove common prefix from routes (default: false)
 *
 * @returns A Fastify plugin that logs routes on server ready
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
 * app.register(routeLogger({ commonPrefix: true }));
 * ```
 */
export function routeLogger({ commonPrefix, logger = defaultLogger }: RouteLoggerOptions = {}) {
  return plugin.sync(function logRoute(app) {
    function logRoutes() {
      logger(app.printRoutes({ commonPrefix }));
    }
    app.addHook("onReady", logRoutes);
  });
}
