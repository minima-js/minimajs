import type { preHandlerAsyncHookHandler, preHandlerHookHandler } from "fastify";
import type { App, Plugin, PluginOptions, Request, Response } from "./types.js";
import { plugin, setOption } from "./internal/plugins.js";
import { isAsyncFunction } from "node:util/types";
import type { InterceptorFilter, InterceptorRegisterOptions } from "./utils/decorators/helpers.js";
import { createErrorDecorator, createResponseDecorator } from "./utils/decorators/index.js";

export type PluginCallback<T extends PluginOptions> = Plugin<T> | Promise<{ default: Plugin<T> }>;

export type Interceptor = preHandlerHookHandler | preHandlerAsyncHookHandler;
export type { InterceptorRegisterOptions };

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

function isAsyncHandler(handler: Interceptor): handler is preHandlerAsyncHookHandler {
  return isAsyncFunction(handler);
}

function invokeHandler(handler: Interceptor, app: App, req: Request, res: Response) {
  if (isAsyncHandler(handler)) {
    return handler.call(app, req, res);
  }
  return new Promise((resolve) => {
    handler.call(app, req, res, resolve);
  });
}

export interface InterceptorOption {
  name?: string;
}
/**
 * Attach middleware(s) to the module.
 * @example
 * ```ts
 * // hello/index.ts
 * import { interceptor, request, type App } from '@minimajs/server'
 * function logRequest() {
 *  console.log(request().url)
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
  setOption(module, {
    name: getModuleName(callback, opt),
  });
  return module;
}

export namespace interceptor {
  /**
   * Creates a response decorator plugin that transforms response bodies before sending.
   * Decorators are executed in sequence and can be registered at both app and module levels.
   * Module-level decorators only apply to routes within that module.
   *
   * @returns A plugin that can be registered with `app.register()`
   *
   * @example
   * ```ts
   * import { response } from '@minimajs/server';
   * app.register(
   *   response.decorate((body) => ({
   *     success: true,
   *     data: body
   *   }))
   * );
   *
   * app.get('/', () => 'hello');
   * // Returns: { success: true, data: 'hello' }
   * ```
   * @since v0.2.0
   */
  export const response = createResponseDecorator;

  /**
   * Creates an error decorator plugin that transforms error responses.
   * Error decorators are executed when an error occurs during request processing.
   * They can modify the error response body before sending it to the client.
   *
   * @returns A plugin that can be registered with `app.register()`
   *
   * @example
   * ```ts
   * import { interceptor } from '@minimajs/server';
   * app.register(
   *   interceptor.error((error, body) => ({
   *     error: true,
   *     message: (error as Error).message,
   *     details: body
   *   }))
   * );
   */
  export const error = createErrorDecorator;

  /**
   * Creates a plugin that registers one or more interceptors as global middleware.
   * Interceptors are executed before route handlers as preHandler hooks.
   */
  export function use(...interceptors: Interceptor[]): Plugin<InterceptorRegisterOptions> {
    return plugin<InterceptorRegisterOptions>(async function middleware(app, { filter }) {
      for (const interceptor of interceptors) {
        async function handler(req: Request, res: Response) {
          if (filter && !(await filter(req))) return;
          return invokeHandler(interceptor, app, req, res);
        }
        app.addHook("preHandler", handler);
      }
    });
  }

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
}
