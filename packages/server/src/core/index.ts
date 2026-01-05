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
import Router from "find-my-way";
import { pino } from "pino";
import type { ServerAdapter, CreateBaseSeverOptions } from "../interfaces/server.js";
import { logger } from "../logger.js";
import { minimajs } from "../plugins/minimajs.js";
import { Server } from "./server.js";

export * from "./server.js";

export function createBaseServer<T>(server: ServerAdapter<T>, options: CreateBaseSeverOptions) {
  const srv = new Server(server, {
    prefix: options.prefix ?? "",
    logger: options.logger === false ? pino({ enabled: false }) : logger,
    router: Router(options.router),
  });
  srv.register(minimajs());
  return srv;
}
