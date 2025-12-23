import type {
  ApplicationHook,
  LifecycleHook as BaseLifecycleHook,
  onCloseAsyncHookHandler,
  onCloseHookHandler,
  onListenAsyncHookHandler,
  onListenHookHandler,
  onReadyAsyncHookHandler,
  onReadyHookHandler,
  onRegisterHookHandler,
  onSendAsyncHookHandler,
  onSendHookHandler,
} from "fastify/types/hooks.js";
import { type ErrorHookCallback, type HookCallback } from "../internal/context.js";
import { plugin } from "../internal/plugins.js";
import { context } from "../context.js";
import type { PluginSync } from "../types.js";
export type { HookCallback, ErrorHookCallback };

/**
 * Registers a callback to execute after the response has been sent.
 * Useful for cleanup tasks, logging, or post-response processing.
 */
export function defer(cb: HookCallback) {
  const { hooks } = context();
  hooks.onSent.add(cb);
}

/**
 * Registers an error handling callback for the current request context.
 * Called when an error occurs during request processing.
 */
export function onError(cb: ErrorHookCallback) {
  const { hooks } = context();
  hooks.onError.add(cb);
}

/**
 * Lifecycle hook event names supported by Minima.js.
 * These correspond to Fastify's lifecycle hook events.
 */
export type LifecycleHook = "close" | "send" | "listen" | "ready" | "register";

const hooksMapping: Record<LifecycleHook, ApplicationHook | BaseLifecycleHook> = {
  close: "onClose",
  send: "onSend",
  listen: "onListen",
  ready: "onReady",
  register: "onRegister",
};

/**
 * Creates a lifecycle hook plugin.
 * Supports both async and sync callbacks - Fastify automatically detects based on function signature.
 *
 * @example
 * ```typescript
 * // Async hooks
 * const closeDB = hook("close", async () => await connection.close());
 * const connectDB = hook("ready", async () => await connection.connect());
 *
 * // Sync hooks with auto-done (no done parameter)
 * const syncClose = hook("close", () => console.log("closed"));
 *
 * // Sync hooks with manual done
 * const syncCloseManual = hook("close", (instance, done) => {
 *   console.log("closed");
 *   done();
 * });
 *
 * // Use plugin.compose to register multiple hooks together
 * app.register(plugin.compose(connectDB, closeDB));
 * ```
 */
export function hook(name: "close", callback: onCloseAsyncHookHandler | onCloseHookHandler): PluginSync;
export function hook(name: "ready", callback: onReadyAsyncHookHandler | onReadyHookHandler): PluginSync;
export function hook(name: "listen", callback: onListenAsyncHookHandler | onListenHookHandler): PluginSync;
export function hook(name: "send", callback: onSendAsyncHookHandler | onSendHookHandler): PluginSync;
export function hook(name: "register", callback: onRegisterHookHandler): PluginSync;
export function hook(name: LifecycleHook, callback: (...args: any[]) => any): PluginSync {
  return plugin.sync(function hooksPlugin(app) {
    app.addHook(hooksMapping[name], callback);
  });
}

/**
 * Cleanup function type for lifespan hooks.
 * Can be either sync or async.
 */
export type LifespanFinalize = onCloseAsyncHookHandler | onCloseHookHandler;

/**
 * Lifespan handler function type.
 * Returns a cleanup function to be executed when the application closes.
 */
export type Lifespan = () => LifespanFinalize | Promise<LifespanFinalize>;

/**
 * Hook utilities namespace providing additional hook-related functionality.
 */
export namespace hook {
  /**
   * Creates a lifespan hook that runs an initialization handler when the application is ready
   * and a cleanup handler when the application is closing. This is useful for managing resources
   * that require both setup and teardown, like database connections or message queue consumers.
   *
   * The `handler` function is executed during the `onReady` lifecycle event. It can optionally
   * return a `finalizer` function, which will be automatically registered to run during the
   * `onClose` event.
   *
   * @param handler - An async function that runs on app startup. It can return a `finalizer` function for cleanup.
   * @returns A Fastify plugin that manages the resource's lifecycle.
   *
   * @example
   * ```typescript
   * // Manages a database connection across the application lifecycle.
   * const dbLifespan = hook.lifespan(async () => {
   *   await db.connect();
   *   console.log('Database connected');
   *
   *   // The returned function will be called on application close.
   *   return async () => {
   *     await db.disconnect();
   *     console.log('Database disconnected');
   *   };
   * });
   *
   * app.register(dbLifespan);
   * ```
   *
   * @example
   * ```typescript
   * // An example of a startup hook without a cleanup finalizer.
   * const startupBanner = hook.lifespan(() => {
   *   console.log('Application is ready!');
   * });
   *
   * app.register(startupBanner);
   * ```
   */
  export function lifespan(handler: Lifespan) {
    return plugin.sync(function lifespanHook(app) {
      app.addHook("onReady", async () => {
        const finalizer = await handler();
        app.addHook("onClose", finalizer);
      });
    });
  }

  /**
   * Union type of all possible lifecycle hook handler signatures.
   * Includes both sync and async variants for each lifecycle event.
   */
  export type AnyHookHandler =
    | onCloseAsyncHookHandler
    | onCloseHookHandler
    | onReadyAsyncHookHandler
    | onReadyHookHandler
    | onListenAsyncHookHandler
    | onListenHookHandler
    | onSendAsyncHookHandler
    | onSendHookHandler
    | onRegisterHookHandler;

  /**
   * Creates a plugin that registers multiple lifecycle hooks at once.
   *
   * @param hooks - An object where keys are lifecycle event names and values are the corresponding hook callbacks.
   * @returns A Fastify plugin that registers the provided hooks.
   *
   * @example
   * ```typescript
   * const multiHook = hook.define({
   *   ready: async () => {
   *     console.log('Application is ready!');
   *   },
   *   close: async () => {
   *     console.log('Application is closing.');
   *   }
   * });
   *
   * app.register(multiHook);
   * ```
   */
  export function define(hooks: Partial<Record<LifecycleHook, AnyHookHandler>>) {
    return plugin.sync(function defineHookPlugin(app) {
      for (const [name, callback] of Object.entries(hooks)) {
        if (callback) {
          app.addHook(hooksMapping[name as LifecycleHook], callback);
        }
      }
    });
  }
}
