import type { App } from "../types.js";
import { handleResponse } from "./response.js";
import { wrap, getHooks } from "./context.js";
import { NotFoundError, errorHandler } from "../error.js";

type CF = CallableFunction;

export interface PluginOption {
  name?: string;
  override?: boolean;
}

export function setPluginOption(cb: any, { name, override }: PluginOption = {}) {
  if (name !== undefined) {
    cb[Symbol.for("fastify.display-name")] = name;
  }

  if (override !== undefined) {
    cb[Symbol.for("skip-override")] = override;
  }

  return cb;
}

export async function triggerOnSent() {
  const hooks = getHooks();
  for (const hook of hooks.onSent) {
    await hook();
  }
}

export const appPlugin = function minimajs(fastify: App, _: {}, next: CF) {
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler((req, res) => errorHandler(new NotFoundError(), req, res));
  fastify.addContentTypeParser("multipart/form-data", (_, __, next) => {
    next(null);
  });
  fastify.addHook("onRequest", wrap);
  fastify.addHook("preSerialization", handleResponse);
  fastify.addHook("onResponse", triggerOnSent);
  next();
};

setPluginOption(appPlugin, { override: true });
