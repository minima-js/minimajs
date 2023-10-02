import type { RegisterOptions, preHandlerHookHandler } from "fastify";
import type { App, Plugin, PluginOptions } from "./types.js";

export type PluginCallback<T extends PluginOptions> =
  | Plugin<T>
  | Promise<{ default: Plugin<T> }>;

export type Interceptor = preHandlerHookHandler;

export interface ModuleOptions extends RegisterOptions, PluginOptions {}

async function toCallback<T extends PluginOptions = {}>(
  callback: PluginCallback<T>
): Promise<Plugin<T>> {
  if (callback instanceof Promise) {
    const resolved = await callback;
    return resolved.default;
  }
  return callback;
}

export function interceptor<T extends PluginOptions = {}>(
  handlers: Interceptor[],
  callback: PluginCallback<T>
) {
  return async function plugin(app: App, opt: PluginOptions & T) {
    callback = callback as Plugin<T>;
    for (const handler of handlers) {
      app.addHook("preHandler", handler);
    }
    callback = await toCallback(callback);
    return callback(app, opt);
  };
}

export async function dynamic<T>(mod: Promise<T>, prop: keyof T) {
  const x = await mod;
  return { default: x[prop] };
}
