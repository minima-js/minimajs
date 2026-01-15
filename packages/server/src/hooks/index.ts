import type {
  LifecycleHook,
  GenericHookCallback,
  HookFactoryCallback,
  LifeSpanCleanupCallback,
} from "../interfaces/hooks.js";
import type {
  OnRequestHook,
  OnTransformHook,
  OnSendHook,
  OnErrorHook,
  OnTimeoutHook,
  OnCloseHook,
  OnListenHook,
  OnReadyHook,
  OnRegisterHook,
} from "../interfaces/hooks.js";
import type { App } from "../interfaces/index.js";
import type { PluginSync } from "../interfaces/plugin.js";
import { plugin } from "../internal/plugins.js";
import { kHooks } from "../symbols.js";

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
export function hook<S>(name: "timeout", callback: OnTimeoutHook<S>): PluginSync<S>;
export function hook<S>(name: "close", callback: OnCloseHook): PluginSync<S>;
export function hook<S>(name: "listen", callback: OnListenHook): PluginSync<S>;
export function hook<S>(name: "ready", callback: OnReadyHook<S>): PluginSync<S>;
export function hook<S>(name: "register", callback: OnRegisterHook): PluginSync<S>;
export function hook<S>(name: LifecycleHook, callback: GenericHookCallback): PluginSync<S> {
  return hook.factory<S>(function hookHandler(hooks) {
    hooks[name].add(callback);
  });
}

export namespace hook {
  export function factory<S>(callback: HookFactoryCallback<S>) {
    return plugin.sync<S>((app) => {
      callback(app.container[kHooks], app);
    });
  }

  /**
   * Creates a plugin that sets up resources on ready and tears them down on close
   */
  export function lifespan<S>(
    setup: (app: App<S>) => void | LifeSpanCleanupCallback<S> | Promise<void | LifeSpanCleanupCallback<S>>
  ): PluginSync<S> {
    return factory(async function lifespanPlugin(hooks, app) {
      hooks.ready.add(async function onReady() {
        const cleanup = await setup(app);
        if (cleanup) {
          hooks.close.add(function onClose() {
            return cleanup(app);
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
      timeout: OnTimeoutHook;
      close: OnCloseHook;
      listen: OnListenHook;
      ready: OnReadyHook;
      register: OnRegisterHook;
    }>
  ): PluginSync {
    return factory(function defineHooksPlugin(hookStore) {
      for (const [name, callback] of Object.entries(hooks)) {
        hookStore[name as LifecycleHook].add(callback);
      }
    });
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { createHooksStore, runHooks, SERVER_HOOKS, LIFECYCLE_HOOKS } from "./store.js";

export type {
  LifecycleHook,
  OnRequestHook,
  OnTransformHook,
  OnSendHook,
  OnErrorHook,
  OnTimeoutHook,
  OnCloseHook,
  OnListenHook,
  OnReadyHook,
  OnRegisterHook,
  GenericHookCallback as HookCallback,
  HookStore,
} from "../interfaces/hooks.js";
