import type { ApplicationHook, LifecycleHook } from "fastify/types/hooks.js";
import { hooks, type ErrorHookCallback, type HookCallback } from "../internal/context.js";
import { createPluginSync } from "../internal/plugins.js";
import type { FastifyPluginCallback } from "fastify";

/**
 * Registers a callback to execute after the response has been sent.
 * Useful for cleanup tasks, logging, or post-response processing.
 */
export function defer(cb: HookCallback) {
  hooks().onSent.add(cb);
}

/**
 * Registers an error handling callback for the current request context.
 * Called when an error occurs during request processing.
 */
export function onError(cb: ErrorHookCallback) {
  hooks().onError.add(cb);
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
 * Creates a Fastify plugin that registers a lifecycle hook.
 * Allows composing multiple hooks together with previous hook dependencies.
 */
export function createHook(name: Hooks, callback: HookCallback, ...prevHooks: Plugin[]): Plugin {
  const hooksPlugin = createPluginSync(function hooksPlugin(app, _, done) {
    app.addHook(hooksMapping[name], callback);
    prevHooks.forEach((prevHook) => {
      prevHook(app, {}, () => {});
    });
    done();
  });

  return hooksPlugin;
}
