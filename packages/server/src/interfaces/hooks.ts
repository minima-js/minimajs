import type { Plugin, PluginOptions } from "./plugin.js";

// Constant array of all lifecycle hooks - single source of truth
export const LIFECYCLE_HOOKS = [
  "request",
  "transform",
  "send",
  "error",
  "sent",
  "timeout",
  "close",
  "listen",
  "ready",
  "register"
] as const;

// Derive the union type from the constant array
export type LifecycleHook = typeof LIFECYCLE_HOOKS[number];

// Hook callback types with specific signatures for each lifecycle event
export type OnRequestHook = (req: Request) => void | Promise<void>;
export type OnTransformHook = (data: unknown, req: Request) => unknown | Promise<unknown>;
export type OnSendHook = (serialized: unknown, req: Request) => void | Promise<void>;
export type OnErrorHook = (err: unknown, req: Request) => unknown | Promise<unknown>;
export type OnSentHook = (req: Request) => void | Promise<void>;
export type OnTimeoutHook = (req: Request) => void | Promise<void>;
export type OnCloseHook = () => void | Promise<void>;
export type OnListenHook = (address: { host: string; port: number }) => void | Promise<void>;
export type OnReadyHook = () => void | Promise<void>;
export type OnRegisterHook = (plugin: Plugin, opts: PluginOptions) => void | Promise<void>;

// Generic hook callback type
export type HookCallback = (...args: unknown[]) => void | Promise<void>;

// Hook store type - object with all lifecycle hooks pre-initialized
export type HookStore = {
  [K in LifecycleHook]: Set<HookCallback>;
};
