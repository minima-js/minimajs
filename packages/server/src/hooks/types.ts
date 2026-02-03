import type { AddressInfo, App, Context } from "../interfaces/index.js";
import type { LifecycleHook } from "./store.js";
import type { Plugin, RegisterOptions } from "../plugin.js";
export type { LifecycleHook };

// Derive the union type from the constant array

// Hook callback types with specific signatures for each lifecycle event
export type OnRequestHook<S = unknown> = (ctx: Context<S>) => void | Response | Promise<void | Response>;
export type OnTransformHook<S = unknown> = (data: unknown, ctx: Context<S>) => unknown | Promise<unknown>;
export type OnSendHook<S = unknown> = (response: Response, ctx: Context<S>) => void | Promise<void>;
export type OnErrorHook<S = unknown> = (err: unknown, ctx: Context<S>) => unknown | Promise<unknown>;
export type OnTimeoutHook<S = unknown> = (ctx: Context<S>) => void | Promise<void>;

// Server Hooks
export type OnCloseHook<S = unknown> = (app: App<S>) => void | Promise<void>;
export type OnListenHook<S = unknown> = (address: AddressInfo, app: App<S>) => void | Promise<void>;
export type OnReadyHook<S = unknown> = (app: App<S>) => void | Promise<void>;
export type OnRegisterHook<S = unknown> = (plugin: Plugin<S>, opts: RegisterOptions) => void | Promise<void>;

export type HookFactoryCallback<S> = (hooks: HookStore, app: App<S>) => void;
export type LifeSpanCleanupCallback<S> = (app: App<S>) => void | Promise<void>;
// Generic hook callback type
export type GenericHookCallback = (...args: any[]) => any | Promise<any>;

// Hook store type - object with all lifecycle hooks pre-initialized and a clone method
export type HookStore = {
  [K in LifecycleHook]: Set<GenericHookCallback>;
} & {
  clone(): HookStore;
};
