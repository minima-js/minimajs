import type { preHandlerAsyncHookHandler, preHandlerHookHandler } from "fastify";
import type { App, Plugin, PluginOptions, Request, Response } from "./types.js";
import { setPluginOption } from "./internal/plugins.js";
import { isAsyncFunction } from "node:util/types";

export type PluginCallback<T extends PluginOptions> = Plugin<T> | Promise<{ default: Plugin<T> }>;

export type Interceptor = preHandlerHookHandler | preHandlerAsyncHookHandler;

async function toCallback<T extends PluginOptions = {}>(callback: PluginCallback<T>): Promise<Plugin<T>> {
  if (callback instanceof Promise) {
    const resolved = await callback;
    return resolved.default;
  }
  return callback;
}

function getModuleName(callback: PluginCallback<any>, opt: InterceptorOption) {
  return opt.name ?? (callback as any).name;
}

export interface InterceptorOption {
  name?: string;
}
/**
 * Attach middleware(s) to the module.
 * @example
 * ```ts
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
  async function module(app: App, appOpt: PluginOptions & T) {
    callback = callback as Plugin<T>;
    for (const handler of handlers) {
      app.addHook("preHandler", handler);
    }
    callback = await toCallback(callback);
    return callback(app, appOpt);
  }
  setPluginOption(module, {
    name: getModuleName(callback, opt),
  });
  return module;
}

export type InterceptorFilter = (req: Request) => boolean | Promise<boolean>;

/**
 * Creates a filtered interceptor that only executes when the filter function returns true.
 * Wraps an interceptor with conditional execution based on request properties.
 */
export function filter(handler: Interceptor, handlerFilter: InterceptorFilter) {
  const pluginHandler: preHandlerAsyncHookHandler = async (req, res) => {
    if (!(await handlerFilter(req))) {
      return;
    }
    return invokeHandler(handler, req.server, req, res);
  };
  return pluginHandler;
}

function isAsyncHandler(handler: Interceptor): handler is preHandlerAsyncHookHandler {
  return isAsyncFunction(handler);
}

/**
 * Invokes an interceptor handler, normalizing both sync and async handlers.
 * Handles both callback-based and promise-based interceptors uniformly.
 */
export function invokeHandler(handler: Interceptor, app: App, req: Request, res: Response) {
  if (isAsyncHandler(handler)) {
    return handler.call(app, req, res);
  }
  return new Promise((resolve) => {
    handler.call(app, req, res, resolve);
  });
}
