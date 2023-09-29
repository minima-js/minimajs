import { wrap } from "../context.js";
import fp from "fastify-plugin";
import type { App } from "../types.js";
import { handleResponse } from "../response.js";
import { doClean } from "../cleanup.js";
type CF = CallableFunction;
export const appPlugin = fp(function appPlugin(fastify: App, _: {}, next: CF) {
  fastify.addHook("onRequest", wrap);
  fastify.addHook("preSerialization", handleResponse);
  fastify.addHook("onSend", doClean);
  next();
});
