import type { Context } from "../interfaces/index.js";
import type { LifecycleHook } from "../hooks/store.js";
import type { Plugin, RegisterOptions } from "./plugin.js";
import type { ResponseBody } from "./response.js";
export type { LifecycleHook };

// Derive the union type from the constant array

// Hook callback types with specific signatures for each lifecycle event
export type OnRequestHook<S = unknown> = (ctx: Context<S>) => void | Response | Promise<void | Response>;
export type OnTransformHook<S = unknown> = (data: unknown, ctx: Context<S>) => unknown | Promise<unknown>;
export type OnSendHook<S = unknown> = (
  serialized: ResponseBody,
  ctx: Context<S>
) => void | Response | Promise<void | Response>;
export type OnErrorHook<S = unknown> = (err: unknown, ctx: Context<S>) => unknown | Promise<unknown>;
export type OnErrorSentHook<S = unknown> = (err: unknown, ctx: Context<S>) => void | Promise<void>;
export type OnSentHook<S = unknown> = (ctx: Context<S>) => void | Promise<void>;
export type OnTimeoutHook<S = unknown> = (ctx: Context<S>) => void | Promise<void>;

// Server Hooks
export type OnCloseHook = () => void | Promise<void>;
export type OnListenHook = (address: { host: string; port: number }) => void | Promise<void>;
export type OnReadyHook = () => void | Promise<void>;
export type OnRegisterHook = (plugin: Plugin, opts: RegisterOptions) => void | Promise<void>;

// Generic hook callback type
export type GenericHookCallback = (...args: any[]) => any | Promise<any>;

// Hook store type - object with all lifecycle hooks pre-initialized and a clone method
export type HookStore = {
  [K in LifecycleHook]: Set<GenericHookCallback>;
} & {
  clone(): HookStore;
};
