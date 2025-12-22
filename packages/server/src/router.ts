import chalk from "chalk";
import { plugin } from "./internal/plugins.js";
import { hook } from "./hooks/index.js";

export interface RouteLoggerOptions {
  logger?: (message: string) => void;
  formatter?: (routes: string) => string;
  commonPrefix?: boolean;
}

/**
 * Logs all registered routes to the console with magenta-colored formatting.
 * Uses the app's printRoutes method to generate a formatted route tree.
 */
export const routeLogger = plugin(async function logRoute(
  app,
  options: RouteLoggerOptions = {}
) {
  const {
    logger = console.log,
    formatter = (routes) => chalk.magenta(routes),
    commonPrefix = false,
  } = options;

  function logRoutes() {
    const routes = app.printRoutes({ commonPrefix });
    const formatted = formatter(routes);
    logger(formatted);
  }

  await app.register(hook("ready", logRoutes));
});
