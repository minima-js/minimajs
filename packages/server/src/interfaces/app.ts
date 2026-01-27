import type { Instance as Router, HTTPVersion } from "find-my-way";
import type { ErrorHandler, Serializer } from "./response.js";
import type { Plugin, PluginOptions, PluginSync, Module, RegisterOptions, Registerable } from "../plugin.js";
import type { Container, Context } from "./context.js";
import type { RouteMetaDescriptor, RouteOptions } from "./route.js";
import type { Logger } from "pino";

export type Handler<S = unknown> = (ctx: Context<S>) => unknown;

export interface App<S = any> {
  server?: S;
  readonly container: Container<S>;
  readonly router: Router<HTTPVersion.V1>;

  readonly $root: App<S>;

  readonly $parent: App<S> | null;

  readonly prefix: string;

  log: Logger;

  serialize: Serializer<S>;

  errorHandler: ErrorHandler<S>;

  get(path: string, handler: Handler<S>): this;
  get(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  post(path: string, handler: Handler<S>): this;
  post(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  put(path: string, handler: Handler<S>): this;
  put(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  delete(path: string, handler: Handler<S>): this;
  delete(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  patch(path: string, handler: Handler<S>): this;
  patch(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  head(path: string, handler: Handler<S>): this;
  head(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  options(path: string, handler: Handler<S>): this;
  options(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  all(path: string, handler: Handler<S>): this;
  all(path: string, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  route(options: RouteOptions, handler: Handler<S>): this;
  route(options: RouteOptions, ...args: [...RouteMetaDescriptor<S>[], Handler<S>]): this;

  // Register plugins with generic options support
  register<T extends PluginOptions>(plugin: Plugin<S, T>, opts?: T): this;
  register(sync: PluginSync<S>): this;
  register<T extends RegisterOptions>(module: Module<S, T>, opts?: T): this;
  // Fallback for plugins with different server types
  register(plugin: Registerable<any>, opts?: any): this;

  handle(request: Request): Promise<Response>;

  ready(): Promise<void>;

  close(): Promise<void>;
}
