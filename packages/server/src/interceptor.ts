import type { RegisterOptions, preHandlerAsyncHookHandler, preHandlerHookHandler } from "fastify";
import type { Plugin, PluginOptions } from "./types.js";
import { createPlugin } from "./internal/plugins.js";

export type PluginCallback<T extends PluginOptions> = Plugin<T> | Promise<{ default: Plugin<T> }>;

export type Interceptor = preHandlerHookHandler | preHandlerAsyncHookHandler;

export interface ModuleOptions extends RegisterOptions, PluginOptions {}

async function toCallback<T extends PluginOptions = {}>(callback: PluginCallback<T>): Promise<Plugin<T>> {
  if (callback instanceof Promise) {
    const resolved = await callback;
    return resolved.default;
  }
  return callback;
}

function getModuleName(callback: any, opt: InterceptorOption) {
  return opt.name ?? callback.name;
}

export interface InterceptorOption {
  name?: string;
}
/**
 * Attach middleware(s) to the module.
 * @example ```ts
 * // hello/index.ts
 * import { interceptor, getRequest, type App } from '@minimajs/server'
 * function logRequest() {
 *  console.log(getRequest().url)
 * }
 * async function hello(app: App) {
 *  app.get('/', () => 'hello');
 * }
 * export helloModule = interceptor([logRequest], hello)
 * ```
 * @since v0.1.0
 */
export function interceptor<T extends PluginOptions = {}>(
  handlers: Interceptor[],
  callback: PluginCallback<T>,
  opt: InterceptorOption = {}
) {
  return createPlugin<PluginOptions & T>(async function module(app, opt) {
    callback = callback as Plugin<T>;
    for (const handler of handlers) {
      app.addHook("preHandler", handler);
    }
    callback = await toCallback(callback);
    return callback(app, opt);
  }, getModuleName(callback, opt));
}
