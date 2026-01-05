import type { LifecycleHook, GenericHookCallback } from "../interfaces/hooks.js";
import type {
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
} from "../interfaces/hooks.js";
import type { Plugin, PluginSync } from "../interfaces/plugin.js";
import { plugin } from "../internal/plugins.js";
import { factory } from "./factory.js";
import { addHook } from "./store.js";

// ============================================================================
// Hook Factory
// ============================================================================

/**
 * Creates a plugin that registers a lifecycle hook
 */
export function hook<S>(name: "request", callback: OnRequestHook<S>): PluginSync<S>;
export function hook<S>(name: "transform", callback: OnTransformHook<S>): PluginSync<S>;
export function hook<S>(name: "send", callback: OnSendHook<S>): PluginSync<S>;
export function hook<S>(name: "error", callback: OnErrorHook<S>): PluginSync<S>;
export function hook<S>(name: "errorSent", callback: OnErrorSentHook<S>): PluginSync<S>;
export function hook<S>(name: "sent", callback: OnSentHook<S>): PluginSync<S>;
export function hook<S>(name: "timeout", callback: OnTimeoutHook<S>): PluginSync<S>;
export function hook<S>(name: "close", callback: OnCloseHook): PluginSync<S>;
export function hook<S>(name: "listen", callback: OnListenHook): PluginSync<S>;
export function hook<S>(name: "ready", callback: OnReadyHook<S>): PluginSync<S>;
export function hook<S>(name: "register", callback: OnRegisterHook): PluginSync<S>;
export function hook(name: LifecycleHook, callback: GenericHookCallback): PluginSync {
  return factory(function hookPlugin(hooks) {
    hooks[name].add(callback);
  });
}

export namespace hook {
  /**
   * Creates a plugin that sets up resources on ready and tears them down on close
   */
  export function lifespan(
    setup: () => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>
  ): Plugin {
    return plugin(async function lifespanPlugin(app) {
      addHook(app, "ready", async () => {
        const cleanup = await setup();
        if (cleanup) {
          addHook(app, "close", async () => {
            await cleanup();
          });
        }
      });
    });
  }

  /**
   * Creates a plugin that registers multiple hooks at once
   */
  export function define(
    hooks: Partial<{
      request: OnRequestHook;
      transform: OnTransformHook;
      send: OnSendHook;
      error: OnErrorHook;
      errorSent: OnErrorSentHook;
      sent: OnSentHook;
      timeout: OnTimeoutHook;
      close: OnCloseHook;
      listen: OnListenHook;
      ready: OnReadyHook;
      register: OnRegisterHook;
    }>
  ): PluginSync {
    return factory(function defineHooksPlugin(hookStore) {
      for (const [name, callback] of Object.entries(hooks)) {
        hookStore[name as LifecycleHook].add(callback as GenericHookCallback);
      }
    });
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { createHooksStore, getHooks, addHook, runHooks, SERVER_HOOKS, LIFECYCLE_HOOKS } from "./store.js";

export type {
  LifecycleHook,
  OnRequestHook,
  OnTransformHook,
  OnSendHook,
  OnErrorHook,
  OnSentHook,
  OnErrorSentHook,
  OnTimeoutHook,
  OnCloseHook,
  OnListenHook,
  OnReadyHook,
  OnRegisterHook,
  GenericHookCallback as HookCallback,
  HookStore,
} from "../interfaces/hooks.js";
