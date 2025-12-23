/**
 * @minimajs/server - High-performance HTTP framework built on Fastify
 *
 * @module @minimajs/server
 *
 * @description
 * Minima.js Server is a high-performance HTTP framework built on top of Fastify,
 * providing context-aware request handling with zero boilerplate.
 *
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
 *
 * @packageDocumentation
 */

import type { Server } from "node:http";
import fastify, { type FastifyBaseLogger } from "fastify";
import merge from "deepmerge";
import { minimajs } from "./internal/plugins.js";
import type { App, AppOptions } from "./types.js";
import { loggerOptions } from "./logger.js";
export { interceptor, type Interceptor } from "./interceptor.js";

export * from "./http.js";
export * from "./hooks/index.js";
export * from "./types.js";
export * from "./middleware.js";

export { createContext } from "./context.js";
export { logger } from "./logger.js";
export { plugin } from "./internal/plugins.js";

/**
 * Merges user-provided app options with default configuration values.
 * Handles logger configuration override and merging with default logger options.
 */
function getDefaultConfig({ logger: loggerOverride, ...override }: AppOptions): AppOptions {
  let logger = loggerOptions as FastifyBaseLogger;
  if (loggerOverride && loggerOverride !== true) {
    logger = merge(logger, loggerOverride);
  }

  return {
    disableRequestLogging: true,
    logger: loggerOverride === false ? undefined : logger,
    ...override,
  };
}

/**
 * Create an app instance
 */
export function createApp(opts: AppOptions = {}): App {
  const app = fastify<Server>(getDefaultConfig(opts));
  app.register(minimajs);
  return app;
}
