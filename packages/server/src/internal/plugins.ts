import type { App } from "../types.js";
import { handleResponse } from "./response.js";
import { wrap, getHooks } from "./context.js";

type CF = CallableFunction;

export function setPluginName(cb: any, name: string) {
  cb[Symbol.for("fastify.display-name")] = name;
  return cb;
}
export function setPluginOverride(cb: any, override: boolean) {
  cb[Symbol.for("skip-override")] = override;
}

export async function triggerOnSent() {
  const hooks = getHooks();
  for (const hook of hooks.onSent) {
    await hook();
  }
}

export const appPlugin = function minimajs(fastify: App, _: {}, next: CF) {
  fastify.addHook("onRequest", wrap);
  fastify.addHook("preSerialization", handleResponse);
  fastify.addHook("onResponse", triggerOnSent);
  next();
};

setPluginOverride(appPlugin, true);
