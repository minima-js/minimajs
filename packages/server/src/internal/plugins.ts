import type { App } from "../types.js";
import { handleResponse } from "../response.js";
import { wrap, getHooks } from "./context.js";

type CF = CallableFunction;

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

(appPlugin as any)[Symbol.for("skip-override")] = true;
