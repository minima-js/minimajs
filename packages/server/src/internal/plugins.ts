import { handleResponse } from "./response.js";
import { wrap } from "./context.js";
import { NotFoundError, errorHandler } from "../error.js";
import type { FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { dispatchError, dispatchSent } from "../hooks/dispatch.js";
import { isAsyncFunction } from "node:util/types";
import type { Plugin, PluginSync } from "../index.js";

export interface PluginOption {
  name?: string;
  override?: boolean;
}

const pluginOptionMappings: { [K in keyof PluginOption]-?: symbol } = {
  name: Symbol.for("fastify.display-name"),
  override: Symbol.for("skip-override"),
};
export function setOption(cb: Plugin<any> | PluginSync<any>, options: PluginOption) {
  for (const [name, value] of Object.entries(options)) {
    const option = pluginOptionMappings[name as keyof PluginOption];
    (cb as any)[option] = value;
  }
  return cb;
}

export function plugin<T extends FastifyPluginOptions>(fn: Plugin<T>, name?: string) {
  setOption(fn, { override: true });
  if (name) {
    setOption(fn, { name });
  }
  return fn;
}

/**
 * Plugin utilities namespace providing helper functions for creating and composing Fastify plugins.
 */
export namespace plugin {
  /**
   * Wraps a sync plugin to automatically call done() if the function doesn't accept it.
   * Prevents plugins from getting stuck if the user forgets to call done().
   */
  function ensureDone<T extends FastifyPluginOptions>(fn: PluginSync<T>): PluginSync<T> {
    if (fn.length < 3) {
      return function wrapped(app, opts, done) {
        fn(app, opts, done);
        done();
      };
    }
    return fn;
  }

  export function sync<T extends FastifyPluginOptions>(fn: PluginSync<T>, name = fn.name) {
    const wrappedFn = ensureDone(fn);
    setOption(wrappedFn, { name: name, override: true });
    return wrappedFn;
  }

  /**
   * Type guard to check if a plugin is async or sync.
   * Uses Node.js util.types.isAsyncFunction to determine if the plugin is an async function.
   */
  function isAsync<Opts extends FastifyPluginOptions>(plg: Plugin<Opts> | PluginSync<Opts>): plg is FastifyPluginAsync {
    return isAsyncFunction(plg);
  }

  /**
   * Composes multiple plugins into a single plugin that registers all of them.
   *
   * @example
   * ```typescript
   * const closeDB = hook("close", async () => await connection.close());
   * const connectDB = hook("ready", async () => await connection.connect());
   *
   * app.register(plugin.compose(connectDB, closeDB));
   * ```
   */
  export function compose<Opts extends FastifyPluginOptions>(...plugins: (Plugin<Opts> | PluginSync<Opts>)[]) {
    return plugin<Opts>(async function composed(app, opts) {
      for (const plg of plugins) {
        if (isAsync(plg)) {
          await plg(app, opts);
          continue;
        }
        await new Promise<void>((resolve, reject) => {
          plg(app, opts, (err) => (err ? reject(err) : resolve()));
        });
      }
    }, `compose(${plugins.map((p) => p.name || "anonymous").join(",")})`);
  }
}

export const minimajs = plugin.sync(function minimajs(fastify) {
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler((req, res) => errorHandler(new NotFoundError(), req, res));
  fastify.addContentTypeParser("multipart/form-data", (_, _1, next) => {
    next(null);
  });
  fastify.addHook("onRequest", wrap);
  fastify.addHook("preSerialization", handleResponse);
  fastify.addHook("onError", dispatchError);
  fastify.addHook("onSend", dispatchSent);
});
