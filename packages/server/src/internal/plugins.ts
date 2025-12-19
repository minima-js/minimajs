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

const pluginOptionMappings: { [K in keyof PluginOption]-?: symbol } = {
  name: Symbol.for("fastify.display-name"),
  override: Symbol.for("skip-override"),
};

export function setPluginOption(cb: PluginCallbackSync<any>, options: PluginOption) {
  for (const [name, value] of Object.entries(options)) {
    const option = pluginOptionMappings[name as keyof PluginOption];
    (cb as any)[option] = value;
  }
  return cb;
}

type AppOptions<T> = T & {
  prefix?: string;
};
type PluginCallbackSync<T> = FastifyPluginCallback<AppOptions<T>, Server>;
type PluginCallback<T> = FastifyPluginAsync<AppOptions<T>, Server>;

export function createPluginSync<T>(fn: PluginCallbackSync<T>, name?: string) {
  setPluginOption(fn, { override: true });
  if (name) {
    setPluginOption(fn, { name });
  }
  return fn;
}

export function createPlugin<T>(fn: PluginCallback<T>, name?: string) {
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
