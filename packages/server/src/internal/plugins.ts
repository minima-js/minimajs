import type { App } from "../types.js";
import { handleResponse } from "./response.js";
import { wrap, getHooks } from "./context.js";
import { NotFoundError, errorHandler } from "../error.js";

type CF = CallableFunction;

export interface PluginOption {
  name?: string;
  override?: boolean;
}

const pluginOptionMappings: Record<string, symbol> = {
  name: Symbol.for("fastify.display-name"),
  override: Symbol.for("skip-override"),
};

export function setPluginOption(cb: any, options: PluginOption) {
  for (const [name, value] of Object.entries(options)) {
    const option = pluginOptionMappings[name]!;
    cb[option] = value;
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
  fastify.addContentTypeParser("multipart/form-data", (_, _1, next) => {
    next(null);
  });
  fastify.addHook("onRequest", wrap);
  fastify.addHook("preSerialization", handleResponse);
  fastify.addHook("onResponse", triggerOnSent);
  next();
};

setPluginOption(appPlugin, { override: true });
