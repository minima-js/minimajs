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
import { deferrer } from "../plugins/deferrer/index.js";
import { Server } from "./server.js";
import { createLogger, logger as defaultLogger } from "../logger.js";
import { moduleDiscovery } from "../plugins/module-discovery/index.js";
import type { ModuleDiscoveryOptions } from "../plugins/module-discovery/types.js";
import { bodyParser, routeLogger } from "../plugins/index.js";
import { executionContext, hook } from "../index.js";
import { composeMiddleware } from "../internal/middleware.js";
import { kMiddlewares } from "../symbols.js";
import { contextProvider } from "../plugins/context-provider/index.js";

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
  moduleDiscovery?: false | ModuleDiscoveryOptions;
}

export function createBaseServer<T>(server: ServerAdapter<T>, options: CreateBaseSeverOptions) {
  let logger: Logger | undefined = options.logger === false ? createLogger({ enabled: false }) : options.logger;

  logger ??= defaultLogger;

  const srv = new Server(server, {
    prefix: options.prefix ?? "",
    logger,
    router: Router({ ignoreTrailingSlash: true, ...options.router }),
  });
  srv.register(contextProvider((ctx, next) => executionContext.run(ctx, next)));
  srv.register(deferrer());
  srv.register(bodyParser());
  srv.register(routeLogger());
  if (options.moduleDiscovery !== false) {
    srv.register(moduleDiscovery(options.moduleDiscovery ?? {}));
  }

  srv.register(
    hook("ready", (app) => {
      app.container.$rootMiddleware = composeMiddleware([...app.container[kMiddlewares]]);
    })
  );

  return srv;
}
