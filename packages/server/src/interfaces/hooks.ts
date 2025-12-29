import type { Plugin, PluginOptions } from "./plugin.js";
import type { ResponseBody } from "./response.js";

// Constant array of all lifecycle hooks - single source of truth
export const LIFECYCLE_HOOKS = [
  "request",
  "transform",
  "send",
  "error",
  "errorSent",
  "sent",
  "timeout",
  "close",
  "listen",
  "ready",
  "register",
] as const;

// Derive the union type from the constant array
export type LifecycleHook = (typeof LIFECYCLE_HOOKS)[number];

// Hook callback types with specific signatures for each lifecycle event
export type OnRequestHook = (req: Request) => void | Response | Promise<void | Response>;
export type OnTransformHook = (data: unknown, req: Request) => unknown | Promise<unknown>;
export type OnSendHook = (serialized: ResponseBody, req: Request) => void | Response | Promise<void | Response>;
export type OnErrorHook = (err: unknown, req: Request) => unknown | Promise<unknown>;
export type OnErrorSentHook = (err: unknown, req: Request) => void | Promise<void>;
export type OnSentHook = (req: Request) => void | Promise<void>;
export type OnTimeoutHook = (req: Request) => void | Promise<void>;
export type OnCloseHook = () => void | Promise<void>;
export type OnListenHook = (address: { host: string; port: number }) => void | Promise<void>;
export type OnReadyHook = () => void | Promise<void>;
export type OnRegisterHook = (plugin: Plugin, opts: PluginOptions) => void | Promise<void>;

// Generic hook callback type
export type GenericHookCallback = (...args: any[]) => any | Promise<any>;

// Hook store type - object with all lifecycle hooks pre-initialized and a clone method
export type HookStore = {
  [K in LifecycleHook]: Set<GenericHookCallback>;
} & {
  clone(): HookStore;
};
