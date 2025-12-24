/**
 * @minimajs/server - High-performance HTTP framework
 * @module @minimajs/server
 * @example
 * ```typescript
 * import { createApp } from "@minimajs/server";
 *
 * const app = createApp();
 *
 * app.get("/", () => ({ message: "Hello World" }));
 *
 * app.listen({ port: 3000 });
 * ```
 */

import type { Logger } from "pino";
import merge from "deepmerge";
import { minimajs } from "./internal/plugins.js";
import { MinimalServer } from "./node/server.js";
import type { App, AppOptions } from "./types.js";
import { logger, loggerOptions } from "./logger.js";

export * from "./interceptor.js";
export * from "./http.js";
export * from "./hooks/index.js";
export * from "./types.js";

export * from "./context.js";
export { logger } from "./logger.js";
export { plugin } from "./internal/plugins.js";

/**
 * Merges user-provided app options with default configuration values.
 * Handles logger configuration override and merging with default logger options.
 */
function getDefaultConfig({ logger: loggerOverride, ...override }: AppOptions): Logger {
  let loggerConfig = loggerOptions;

  if (loggerOverride === false) {
    // Create a no-op logger
    return logger.child({ enabled: false });
  }

  if (loggerOverride && loggerOverride !== true) {
    loggerConfig = merge(loggerOptions, loggerOverride as any);
  }

  return logger.child(loggerConfig);
}

/**
 * Create an app instance
 */
export function createApp(opts: AppOptions = {}): App {
  const appLogger = getDefaultConfig(opts);
  const app = new MinimalServer(appLogger) as App;
  app.register(minimajs);
  return app;
}
