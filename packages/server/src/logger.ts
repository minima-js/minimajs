/**
 * Logging utilities
 *
 * Provides logging utilities built on Pino with pretty printing support.
 * Includes context-aware logging with automatic module name enrichment.
 *
 * @module @minimajs/server/logger
 *
 * @example
 * ```typescript
 * import { logger } from '@minimajs/server/logger';
 *
 * const log = logger();
 * log.info('Request received');
 * log.error({ err }, 'Error occurred');
 * ```
 */

import { pino, type LoggerOptions } from "pino";
import merge from "deepmerge";
import { maybeContext } from "./context.js";
import type { App } from "./interfaces/app.js";
import { kModulesChain, kModuleName } from "./symbols.js";

export const loggerOptions: LoggerOptions = {
  transport: {
    target: "pino-pretty",
    options: {
      ignore: "hostname,pid",
      singleLine: true,
      colorize: true,
    },
  },
};

function getPluginNames(server: App): string {
  const chain = server.container[kModulesChain] as App[];
  return chain
    .slice(-3)
    .map((app) => {
      return app.container[kModuleName] as string;
    })
    .filter(Boolean)
    .join("/");
}

function getModuleName() {
  const ctx = maybeContext();
  if (!ctx) {
    return null;
  }
  const { route, locals } = ctx;
  if (!locals[kModuleName]) {
    let name = getPluginNames(ctx.app);
    const handler = route?.handler.name;
    if (handler) {
      name = name + ":" + handler;
    }
    locals[kModuleName] = name;
  }
  return locals[kModuleName];
}
/**
 * Mixin function for Pino logger that enriches log data with module name context.
 * Automatically adds the current module name to log entries if not already present.
 */
export function mixin(data: Dict<unknown>) {
  const name = getModuleName();
  if (!name || data.name) {
    return data;
  }
  data.name = name;
  return data;
}

/**
 * Creates a Pino logger instance with merged default options and mixin support.
 * Combines default logger options with user-provided options and adds module name context.
 */
export function createLogger(option: LoggerOptions) {
  return pino(merge({ ...loggerOptions, mixin }, option));
}

export const logger = createLogger({});
