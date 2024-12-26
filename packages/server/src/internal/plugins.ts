import type { Server } from "node:http";
import { handleResponse } from "./response.js";
import { wrap } from "./context.js";
import { NotFoundError, errorHandler } from "../error.js";
import type { FastifyPluginAsync, FastifyPluginCallback } from "fastify";
import { dispatchError, dispatchSent } from "../hooks/dispatch.js";

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

type BaseApp = Record<string | number | symbol, any>;
type AppOptions<T extends BaseApp> = T & {
  prefix?: string;
};
type PluginCallbackSync<T extends BaseApp> = FastifyPluginCallback<AppOptions<T>, Server>;
type PluginCallback<T extends BaseApp> = FastifyPluginAsync<AppOptions<T>, Server>;

export function createPluginSync<T extends BaseApp>(fn: PluginCallbackSync<T>, name?: string) {
  setPluginOption(fn, { override: true });
  if (name) {
    setPluginOption(fn, { name });
  }
  return fn;
}

export function createPlugin<T extends BaseApp>(fn: PluginCallback<T>, name?: string) {
  setPluginOption(fn, { override: true });
  if (name) {
    setPluginOption(fn, { name });
  }
  return fn;
}

export const appPlugin = createPluginSync(function minimajs(fastify, _, next) {
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler((req, res) => errorHandler(new NotFoundError(), req, res));
  fastify.addContentTypeParser("multipart/form-data", (_, _1, next) => {
    next(null);
  });
  fastify.addHook("onRequest", wrap);
  fastify.addHook("preSerialization", handleResponse);
  fastify.addHook("onError", dispatchError);
  fastify.addHook("onSend", dispatchSent);
  next();
});
