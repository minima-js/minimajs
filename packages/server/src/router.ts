import chalk from "chalk";
import type { App } from "./types.js";

/**
 * Logs all registered routes to the console with magenta-colored formatting.
 * Uses the app's printRoutes method to generate a formatted route tree.
 */
export function logRoutes(app: App) {
  console.log(
    chalk.magenta(
      app.printRoutes({
        commonPrefix: false,
      })
    )
  );
}
