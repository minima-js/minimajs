import Router from "find-my-way";
import type { HTTPMethod, HTTPVersion } from "find-my-way";
import type {
  HookStore,
  OnRequestHook,
  OnTransformHook,
  OnSendHook,
  OnErrorHook,
  OnErrorSentHook,
  OnSentHook,
  OnTimeoutHook,
  OnCloseHook,
  OnListenHook,
  OnReadyHook,
  OnRegisterHook,
} from "./hooks.js";
import type { ErrorHandler, Serializer } from "./response.js";
import type { Plugin, PluginOptions } from "./plugin.js";

export type Container = Map<symbol, unknown>;

export type RouteHandler = (req: Request) => unknown;

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface App<T = unknown> {
  server?: T;
  readonly container: Container;
  // HTTP methods
  readonly hooks: HookStore;

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

  close(): Promise<void>;

  // Hook method overloads for type safety
  on(hook: "request", callback: OnRequestHook): this;
  on(hook: "transform", callback: OnTransformHook): this;
  on(hook: "send", callback: OnSendHook): this;
  on(hook: "error", callback: OnErrorHook): this;
  on(hook: "errorSent", callback: OnErrorSentHook): this;
  on(hook: "sent", callback: OnSentHook): this;
  on(hook: "timeout", callback: OnTimeoutHook): this;
  on(hook: "close", callback: OnCloseHook): this;
  on(hook: "listen", callback: OnListenHook): this;
  on(hook: "ready", callback: OnReadyHook): this;
  on(hook: "register", callback: OnRegisterHook): this;
}
