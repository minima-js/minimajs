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
import type { Plugin } from "../interfaces/plugin.js";
import { plugin } from "../internal/plugins.js";
import { addHook } from "./store.js";

// ============================================================================
// Hook Factory
// ============================================================================

/**
 * Creates a plugin that registers a lifecycle hook
 */
export function hook(name: "request", callback: OnRequestHook): Plugin;
export function hook(name: "transform", callback: OnTransformHook): Plugin;
export function hook(name: "send", callback: OnSendHook): Plugin;
export function hook(name: "error", callback: OnErrorHook): Plugin;
export function hook(name: "errorSent", callback: OnErrorSentHook): Plugin;
export function hook(name: "sent", callback: OnSentHook): Plugin;
export function hook(name: "timeout", callback: OnTimeoutHook): Plugin;
export function hook(name: "close", callback: OnCloseHook): Plugin;
export function hook(name: "listen", callback: OnListenHook): Plugin;
export function hook(name: "ready", callback: OnReadyHook): Plugin;
export function hook(name: "register", callback: OnRegisterHook): Plugin;
export function hook(name: LifecycleHook, callback: GenericHookCallback): Plugin {
  return plugin(function hookPlugin(app) {
    addHook(app, name, callback);
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
  ): Plugin {
    return plugin(function defineHooksPlugin(app) {
      for (const [name, callback] of Object.entries(hooks)) {
        addHook(app, name as LifecycleHook, callback as GenericHookCallback);
      }
    });
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { defer, onError } from "../plugins/minimajs.js";
export { createHooksStore, getHooks, addHook, runHooks } from "./store.js";

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
