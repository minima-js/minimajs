import type { Instance as Router, HTTPVersion } from "find-my-way";
import type { ErrorHandler, Serializer } from "./response.js";
import type { Plugin, PluginOptions, PluginSync, Register, RegisterOptions } from "./plugin.js";
import type { Context } from "./context.js";
import type { PrefixOptions, RouteMetaDescriptor, RouteOptions } from "./route.js";
import type { Logger } from "pino";

export type Container = Map<symbol, unknown>;

export type RouteHandler<S = unknown> = (ctx: Context<S>) => unknown;

export interface App<S = any> {
  server?: S;
  readonly container: Container;
  readonly router: Router<HTTPVersion.V1>;

  readonly $root: App<S>;

  readonly $parent: App<S> | null;

  readonly $prefix: string;
  readonly $prefixExclude: string[];

  log: Logger;

  serialize: Serializer<S>;

  errorHandler: ErrorHandler<S>;

  get(path: string, handler: RouteHandler<S>): this;
  get(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  post(path: string, handler: RouteHandler<S>): this;
  post(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  put(path: string, handler: RouteHandler<S>): this;
  put(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  delete(path: string, handler: RouteHandler<S>): this;
  delete(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  patch(path: string, handler: RouteHandler<S>): this;
  patch(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  head(path: string, handler: RouteHandler<S>): this;
  head(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  options(path: string, handler: RouteHandler<S>): this;
  options(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  all(path: string, handler: RouteHandler<S>): this;
  all(path: string, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  route(options: RouteOptions, handler: RouteHandler<S>): this;
  route(options: RouteOptions, ...args: [...RouteMetaDescriptor<S>[], RouteHandler<S>]): this;

  prefix(prefix: string, options?: PrefixOptions): this;

  // Register with plugin wrapper (prefix not allowed in opts)
  register<T>(plugin: Plugin<PluginOptions<T>>, opts?: T): this;
  register<T>(plugin: PluginSync<PluginOptions<T>>, opts?: T): this;
  // Register with plain function (prefix allowed in opts)
  register<T>(plugin: Register<RegisterOptions<T>>, opts?: T): this;

  handle(request: Request): Promise<Response>;

  ready(): Promise<void>;

  close(): Promise<void>;
}
