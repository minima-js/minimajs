import Router from "find-my-way";
import type { HookStore } from "../hooks/types.js";
import type { RouteHandler } from "./route.js";
import type { Serializer } from "./response.js";

export type Container = Map<symbol, unknown>;

export interface App {
  readonly container: Container;
  // HTTP methods
  readonly hooks: HookStore;

  readonly router: Router.Instance<Router.HTTPVersion.V1>;

  serialize: Serializer;

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
