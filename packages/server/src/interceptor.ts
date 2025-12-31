import type { OnErrorHook, OnRequestHook, OnTransformHook } from "./interfaces/hooks.js";
import type { App } from "./interfaces/app.js";
import type { Plugin, RegisterOptions, Register } from "./interfaces/plugin.js";
import { plugin } from "./internal/plugins.js";
import { addHook, hook } from "./hooks/index.js";
import type { InterceptorFilter, InterceptorRegisterOptions } from "./utils/decorators/helpers.js";
import type { Context } from "./context.js";

export type Interceptor = OnRequestHook;

export type { InterceptorRegisterOptions, InterceptorFilter };

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
export function interceptor<T extends RegisterOptions = {}>(handlers: Interceptor[], callback: Register<T>) {
  async function module(app: App, appOpt: T) {
    callback = callback as Plugin<T>;
    for (const handler of handlers) {
      app.register(hook("request", handler));
    }
    return callback(app, appOpt);
  }

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
   *
   * @example With filter
   * ```ts
   * app.register(
   *   interceptor.response((body) => ({ data: body })),
   *   { filter: (req) => req.url.pathname.startsWith('/api') }
   * );
   * ```
   * @since v0.2.0
   */
  export function response(transform: OnTransformHook): Plugin<InterceptorRegisterOptions> {
    return plugin<InterceptorRegisterOptions>(async function responsePlugin(app, { filter }) {
      async function handler(data: unknown, ctx: Context) {
        if (filter && !(await filter(ctx))) return data;
        return transform(data, ctx);
      }
      addHook(app, "transform", handler);
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
   * ```
   *
   * @example With filter
   * ```ts
   * app.register(
   *   interceptor.error((err) => ({ error: err.message })),
   *   { filter: (req) => req.url.pathname.startsWith('/api') }
   * );
   * ```
   */
  export function error(transform: OnErrorHook): Plugin<InterceptorRegisterOptions> {
    return plugin<InterceptorRegisterOptions>(async function errorPlugin(app, { filter }) {
      async function handler(err: unknown, ctx: Context) {
        if (filter && !(await filter(ctx))) throw err;
        return transform(err, ctx);
      }
      addHook(app, "error", handler);
    });
  }

  /**
   * Creates a plugin that registers one or more interceptors as global middleware.
   * Interceptors are executed before route handlers as preHandler hooks.
   */
  export function use(...interceptors: Interceptor[]): Plugin<InterceptorRegisterOptions> {
    return plugin<InterceptorRegisterOptions>(async function middleware(app, { filter }) {
      for (const interceptor of interceptors) {
        async function handler(ctx: Context) {
          if (filter && !(await filter(ctx))) return;
          return interceptor(ctx);
        }
        app.register(hook("request", handler));
      }
    });
  }

  /**
   * Creates a filtered interceptor that only executes when the filter function returns true.
   * Wraps an interceptor with conditional execution based on request properties.
   */
  export function filter(handler: Interceptor, handlerFilter: InterceptorFilter) {
    const pluginHandler: OnRequestHook = async (ctx) => {
      if (!(await handlerFilter(ctx))) {
        return;
      }
      return handler(ctx);
    };
    return pluginHandler;
  }
}
