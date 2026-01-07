/**
 * Core server implementation internals.
 *
 * This module exposes the internal Server class and related utilities.
 * Most users should use the App interface through createApp() instead.
 *
 * @module @minimajs/server/core
 *
 * @example
 * ```typescript
 * import { Server } from '@minimajs/server/core';
 *
 * // Advanced usage - most users don't need this
 * const server = new Server(adapter, options);
 * ```
 */
import Router, { type HTTPVersion, type Config as RouterConfig } from "find-my-way";
import { type Logger } from "pino";
import type { ServerAdapter } from "../interfaces/server.js";
import { minimajs } from "../plugins/minimajs.js";
import { Server } from "./server.js";
import { createLogger } from "../logger.js";

export * from "./server.js";

/**
 * Configuration options for creating a base server instance.
 */
export interface CreateBaseSeverOptions {
  /** Router configuration from find-my-way */
  router?: RouterConfig<HTTPVersion>;
  /** URL prefix for all routes */
  prefix?: string;
  /** Pino logger instance, or false to disable logging */
  logger?: Logger | false;
}

export function createBaseServer<T>(server: ServerAdapter<T>, options: CreateBaseSeverOptions) {
  let logger: Logger | undefined = options.logger === false ? createLogger({ enabled: false }) : options.logger;
  logger ??= createLogger({});
  const srv = new Server(server, {
    prefix: options.prefix ?? "",
    logger,
    router: Router(options.router),
  });
  srv.register(minimajs());
  return srv;
}
