import Router from "find-my-way";
import type { HTTPVersion } from "find-my-way";
import type { ErrorHandler, Serializer } from "./response.js";
import type { Plugin, PluginOptions, PluginSync, Register, RegisterOptions } from "./plugin.js";
import type { Context } from "./context.js";
import type { PrefixOptions, RouteMetaDescriptor, RouteOptions } from "./route.js";
import type { Logger } from "pino";

export type Container = Map<symbol, unknown>;
export type RouteMetadata = Map<symbol, Set<unknown>>;

export type RouteHandler = (ctx: Context) => unknown;

export interface App<T = unknown> {
  server?: T;
  readonly container: Container;
  readonly router: Router.Instance<HTTPVersion.V1>;

  log: Logger;

  serialize: Serializer;

  errorHandler: ErrorHandler;

  get(path: string, handler: RouteHandler): this;
  get(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  post(path: string, handler: RouteHandler): this;
  post(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  put(path: string, handler: RouteHandler): this;
  put(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  delete(path: string, handler: RouteHandler): this;
  delete(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  patch(path: string, handler: RouteHandler): this;
  patch(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  head(path: string, handler: RouteHandler): this;
  head(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  options(path: string, handler: RouteHandler): this;
  options(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  all(path: string, handler: RouteHandler): this;
  all(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  route(options: RouteOptions, handler: RouteHandler): this;
  route(options: RouteOptions, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  prefix(prefix: string, options?: PrefixOptions): this;

  // Register with plugin wrapper (prefix not allowed in opts)
  register<T>(plugin: Plugin<PluginOptions<T>>, opts?: T): this;
  register<T>(plugin: PluginSync<PluginOptions<T>>, opts?: T): this;
  // Register with plain function (prefix allowed in opts)
  register<T>(plugin: Register<RegisterOptions<T>>, opts?: T): this;

  inject(request: Request): Promise<Response>;

  ready(): Promise<void>;

  close(): Promise<void>;
}
