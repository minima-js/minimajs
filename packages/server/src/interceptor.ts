import type { OnRequestHook } from "./interfaces/hooks.js";
import type { App } from "./interfaces/app.js";
import type { Plugin, RegisterOptions, Module } from "./interfaces/plugin.js";
import { hook } from "./hooks/index.js";
import type { InterceptorFilter, InterceptorRegisterOptions } from "./utils/decorators/helpers.js";

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
export function interceptor<S, T extends RegisterOptions = {}>(handlers: Interceptor[], callback: Module<S, T>) {
  async function module(app: App<S>, appOpt: T) {
    callback = callback as Plugin<S>;
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
