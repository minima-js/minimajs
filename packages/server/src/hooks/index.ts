import type { ApplicationHook, LifecycleHook } from "fastify/types/hooks.js";
import { type ErrorHookCallback, type HookCallback } from "../internal/context.js";
import { plugin } from "../internal/plugins.js";
import type { FastifyPluginCallback } from "fastify";
import { context } from "../context.js";
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

type Hooks = "close" | "send" | "serialize" | "listen" | "ready" | "register";

const hooksMapping: Record<Hooks, ApplicationHook | LifecycleHook> = {
  close: "onClose",
  send: "onSend",
  listen: "onListen",
  serialize: "onListen",
  ready: "onReady",
  register: "onRegister",
};

type Plugin = FastifyPluginCallback;

/**
 * Creates a lifecycle hook plugin.
 *
 * @example
 * ```typescript
 * const closeDB = hook("close", async () => await connection.close());
 * const connectDB = hook("ready", async () => await connection.connect());
 *
 * // Use plugin.compose to register multiple hooks together
 * app.register(plugin.compose(connectDB, closeDB));
 * ```
 */
export function hook(name: Hooks, callback: HookCallback): Plugin {
  return plugin.sync(function hooksPlugin(app, _, done) {
    app.addHook(hooksMapping[name], callback);
    done();
  });
}
