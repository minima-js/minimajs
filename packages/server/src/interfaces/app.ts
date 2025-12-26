import type { RouteHandler } from "./route.js";

export type Container = Map<symbol, unknown>;

export interface App {
  readonly container: Container;
  readonly hooks: Map<any, any>;
  // HTTP methods
  get(path: string, handler: RouteHandler): this;

  post(path: string, handler: RouteHandler): this;

  put(path: string, handler: RouteHandler): this;

  delete(path: string, handler: RouteHandler): this;

  patch(path: string, handler: RouteHandler): this;

  head(path: string, handler: RouteHandler): this;

  options(path: string, handler: RouteHandler): this;

  all(path: string, handler: RouteHandler): this;
  register(plugin: (app: App, opts: any, done?: (err?: Error) => void) => void | Promise<void>, opts: any): this;
}
