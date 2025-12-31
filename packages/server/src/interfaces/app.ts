import Router from "find-my-way";
import type { HTTPMethod, HTTPVersion } from "find-my-way";
import type { ErrorHandler, Serializer } from "./response.js";
import type { Plugin, PluginOptions, PluginSync, Register, RegisterOptions } from "./plugin.js";

export type Container = Map<symbol, unknown>;
export type RouteMetadata = Map<symbol, unknown>;

export type RouteHandler = (req: Request) => unknown;
export type RouteMetaDescriptor = [symbol: symbol, value: unknown] | ((app: App) => [symbol: symbol, value: unknown]);

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface PrefixOptions {
  exclude?: string[];
}

export interface App<T = unknown> {
  server?: T;
  readonly container: Container;
  readonly router: Router.Instance<HTTPVersion.V1>;

  serialize: Serializer;

  errorHandler: ErrorHandler;

  get(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  post(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  put(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  delete(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  patch(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  head(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  options(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  all(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  route(options: RouteOptions, ...args: [...RouteMetaDescriptor[], RouteHandler]): this;

  prefix(prefix: string, options?: PrefixOptions): this;

  // Register with plugin wrapper (prefix not allowed in opts)
  register<T>(plugin: Plugin<PluginOptions<T>>, opts?: T): this;
  register<T>(plugin: PluginSync<PluginOptions<T>>, opts?: T): this;
  // Register with plain function (prefix allowed in opts)
  register<T>(plugin: Register<RegisterOptions<T>>, opts?: T): this;

  inject(request: Request | string): Promise<Response>;

  ready(): Promise<void>;

  close(): Promise<void>;
}
