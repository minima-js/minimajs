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

import { pino, type Logger, type LoggerOptions } from "pino";
import merge from "deepmerge";
import { maybeContext } from "../context.js";
import { kModuleName } from "../symbols.js";
import { buildModuleName, isPrettyEnabled, kPretty } from "./helpers.js";

const prettyTransport: LoggerOptions["transport"] = {
  target: "pino-pretty",
  options: { singleLine: true, colorize: true },
};

export const loggerOptions: LoggerOptions = {
  base: null,
  formatters: { level: (label) => ({ level: label }) },
};

if (process.env.LOG_LEVEL) {
  loggerOptions.level = process.env.LOG_LEVEL;
}

export function mixin(data: Dict<unknown>, _level: number, logger: Logger) {
  const ctx = maybeContext();
  if (!ctx) {
    if (!data.name) data.name = (logger as any)[kModuleName];
    return data;
  }
  if (!data.requestId) data.requestId = ctx.requestId;
  if (!data.name) {
    const { route, locals } = ctx;
    if (!(kModuleName in locals)) {
      locals[kModuleName] = buildModuleName(ctx.app, route?.handler.name);
    }
    const name = locals[kModuleName] as string;
    if (name) data.name = name;
  }
  return data;
}

export function createLogger({ pretty = isPrettyEnabled(), ...option }: LoggerOptions & { pretty?: boolean } = {}) {
  const log = pino(merge({ ...loggerOptions, mixin, ...(pretty && { transport: prettyTransport }) }, option));
  (log as any)[kPretty] = pretty;
  return log;
}
