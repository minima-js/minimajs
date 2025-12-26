import type { IncomingHttpHeaders } from "node:http";
import type { Logger } from "pino";

export * from "./interfaces/index.js";

import type { App } from "./interfaces/app.js";

type OmitIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type HttpHeader = string;
export type HTTPMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type HttpCodes = number;
export type HttpHeaderIncoming = keyof OmitIndexSignature<IncomingHttpHeaders> | (string & Record<never, never>);

export interface PluginOptions {
  name?: string;
}

export type Plugin<Opts = Record<never, never>> = (
  app: App,
  opts: Opts,
  done?: (err?: Error) => void
) => void | Promise<void>;

/**
 * Plugin callback type used for hook plugins.
 */
export type PluginSync<Opts = Record<never, never>> = (app: App, opts: Opts, done: (err?: Error) => void) => void;

export interface AppOptions {
  logger?: Logger | boolean;
  disableRequestLogging?: boolean;
}

export type Dict<T = unknown> = NodeJS.Dict<T>;
export type Next = (error?: unknown, response?: unknown) => void;
export type Signals = NodeJS.Signals;
export type GenericCallback = (...args: any[]) => any;
