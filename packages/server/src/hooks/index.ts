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
import type { FastifyPluginCallback } from "fastify";
import { context } from "../context.js";
import { last } from "../utils/iterable.js";
export type { HookCallback };

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

type LifecycleHook = "close" | "send" | "listen" | "ready" | "register";

const hooksMapping: Record<LifecycleHook, ApplicationHook | BaseLifecycleHook> = {
  close: "onClose",
  send: "onSend",
  listen: "onListen",
  ready: "onReady",
  register: "onRegister",
};

type Plugin = FastifyPluginCallback;

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
export function hook(name: "close", callback: onCloseAsyncHookHandler | onCloseHookHandler): Plugin;
export function hook(name: "ready", callback: onReadyAsyncHookHandler | onReadyHookHandler): Plugin;
export function hook(name: "listen", callback: onListenAsyncHookHandler | onListenHookHandler): Plugin;
export function hook(name: "send", callback: onSendAsyncHookHandler | onSendHookHandler): Plugin;
export function hook(name: "register", callback: onRegisterHookHandler): Plugin;
export function hook(name: LifecycleHook, callback: (...args: any[]) => any): Plugin {
  return plugin.sync(function hooksPlugin(app) {
    app.addHook(hooksMapping[name], callback);
  });
}

type LifespanFinalize = () => void | Promise<void>;
type Lifespan = () => LifespanFinalize | Promise<LifespanFinalize>;

/**
 * Hook utilities namespace providing additional hook-related functionality.
 */
export namespace hook {
  /**
   * Creates a lifespan hook that runs initialization on app ready and cleanup on app close.
   * This pattern is useful for managing resources that need both setup and teardown.
   *
   * The handler function is called when the app becomes ready and should return a finalizer function.
   * The finalizer is automatically called when the app closes.
   *
   * @param handler - A function that runs on app ready and returns a cleanup function
   * @returns A plugin that manages the resource lifecycle
   *
   * @example
   * ```typescript
   * // Database connection with lifespan
   * const dbLifespan = hook.lifespan(async () => {
   *   await db.connect();
   *   console.log('Database connected');
   *
   *   // Return cleanup function
   *   return async () => {
   *     await db.disconnect();
   *     console.log('Database disconnected');
   *   };
   * });
   *
   * app.register(dbLifespan);
   * ```
   */
  export function lifespan(handler: Lifespan) {
    return plugin.sync(function lifespanHook(app) {
      let finalizer: LifespanFinalize | null = null;
      app.addHook("onReady", async () => {
        finalizer = await handler();
      });
      if (finalizer) {
        app.addHook("onClose", finalizer);
      }
    });
  }
}
