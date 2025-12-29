import Router from "find-my-way";
import type { FindResult, HTTPMethod, HTTPVersion } from "find-my-way";
import type { ErrorHandler, Serializer } from "./response.js";
import type { Plugin, PluginOptions } from "./plugin.js";

export type Container = Map<symbol, unknown>;

export type RouteHandler = (req: Request) => unknown;

export interface Route extends FindResult<HTTPVersion.V1> {
  store: {
    handler: RouteHandler;
  };
}

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface App<T = unknown> {
  server?: T;
  readonly container: Container;
  readonly router: Router.Instance<HTTPVersion.V1>;

  serialize: Serializer;

  errorHandler: ErrorHandler;

  get(path: string, handler: RouteHandler): this;

  post(path: string, handler: RouteHandler): this;

  put(path: string, handler: RouteHandler): this;

  delete(path: string, handler: RouteHandler): this;

  patch(path: string, handler: RouteHandler): this;

  head(path: string, handler: RouteHandler): this;

  options(path: string, handler: RouteHandler): this;

  all(path: string, handler: RouteHandler): this;

  route(options: RouteOptions, handler: RouteHandler): this;

  register<T extends PluginOptions>(plugin: Plugin<T>, opts?: T): this;

  inject(request: Request | string): Promise<Response>;

  close(): Promise<void>;
}
