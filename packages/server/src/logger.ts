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
import type { App, Dict, Request } from "./types.js";
import { kPluginNameChain, kRequestContext } from "./internal/fastify.js";

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

function getPluginNames(server: App): string {
  const plugins = server[kPluginNameChain];
  if (!plugins) return "";
  return plugins[0] ?? "";
}
function getHandler(req: Request) {
  return (req as any)[kRequestContext]?.handler.name.replace("bound ", "");
}

const kModuleName = Symbol("module name");

function getModuleName() {
  const ctx = maybeContext();
  if (!ctx) {
    return null;
  }
  const { req, local } = ctx;
  if (!local.has(kModuleName)) {
    let name = getPluginNames(req.server);
    const handler = getHandler(req);
    if (handler) {
      name = name + ":" + handler;
    }
    local.set(kModuleName, name);
  }
  return local.get(kModuleName);
}

/**
 * Creates a Pino logger instance with merged default options and mixin support.
 * Combines default logger options with user-provided options and adds module name context.
 */
export function createLogger(option: LoggerOptions) {
  return pino(merge({ ...loggerOptions, mixin }, option));
}

export const logger = createLogger({});
