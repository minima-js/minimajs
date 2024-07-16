import type { ApplicationHook, LifecycleHook } from "fastify/types/hooks.js";
import { getHooks, type HookCallback } from "./internal/context.js";
import type { App } from "./types.js";
import { setPluginOption } from "./internal/plugins.js";
import type { FastifyPluginCallback } from "fastify";

export function defer(cb: HookCallback) {
  const hooks = getHooks();
  hooks.onSent.add(cb);
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
type Done = (err?: Error) => void;

export function createHook(name: Hooks, callback: HookCallback, ...prevHooks: Plugin[]): Plugin {
  function hooksPlugin(app: App, _: {}, done: Done) {
    app.addHook(hooksMapping[name], callback);
    prevHooks.forEach((prevHook) => {
      prevHook(app, {}, () => {});
    });
    done();
  }
  setPluginOption(hooksPlugin, { override: true });
  return hooksPlugin;
}
