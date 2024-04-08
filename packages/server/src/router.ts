import chalk from "chalk";
import type { App } from "./types.js";

export function logRoutes(app: App) {
  console.log(
    chalk.magenta(
      app.printRoutes({
        commonPrefix: false,
      })
    )
  );
}
