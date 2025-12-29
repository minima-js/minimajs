import type { OnErrorHook, OnRequestHook, OnTransformHook } from "./interfaces/hooks.js";
import type { App } from "./interfaces/app.js";
import type { Plugin, PluginOptions } from "./interfaces/plugin.js";
import { plugin, setOption } from "./internal/plugins.js";
import type { InterceptorFilter, InterceptorRegisterOptions } from "./utils/decorators/helpers.js";

export type PluginCallback<T extends PluginOptions> = Plugin<T> | Promise<{ default: Plugin<T> }>;

export type Interceptor = OnRequestHook;

export type { InterceptorRegisterOptions, InterceptorFilter };

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
 * import { interceptor, request, type App } from '@minimajs/server'
 * function logRequest() {
 *  console.log(request().url)
 * }
 * async function hello(app: App) {
 *  app.get('/', () => 'hello');
 * }
 * export const helloModule = interceptor([logRequest], hello)
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
      app.on("request", handler);
    }
    callback = await toCallback(callback);
    return callback(app, appOpt);
  }
  setOption(module as Plugin, {
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
   * import { interceptor } from '@minimajs/server';
   * app.register(
   *   interceptor.response((body) => ({
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
  export function response(transform: OnTransformHook) {
    return plugin(function onTransform(app) {
      app.on("transform", transform);
    });
  }

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
  export function error(transform: OnErrorHook) {
    return plugin(function onError(app) {
      app.on("error", transform);
    });
  }

  /**
   * Creates a plugin that registers one or more interceptors as global middleware.
   * Interceptors are executed before route handlers as preHandler hooks.
   */
  export function use(...interceptors: Interceptor[]): Plugin<InterceptorRegisterOptions> {
    return plugin<InterceptorRegisterOptions>(async function middleware(app, { filter }) {
      for (const interceptor of interceptors) {
        async function handler(req: Request) {
          if (filter && !(await filter(req))) return;
          return interceptor(req);
        }
        app.on("request", handler);
      }
    });
  }

  /**
   * Creates a filtered interceptor that only executes when the filter function returns true.
   * Wraps an interceptor with conditional execution based on request properties.
   */
  export function filter(handler: Interceptor, handlerFilter: InterceptorFilter) {
    const pluginHandler: OnRequestHook = async (req) => {
      if (!(await handlerFilter(req))) {
        return;
      }
      return handler(req);
    };
    return pluginHandler;
  }
}
