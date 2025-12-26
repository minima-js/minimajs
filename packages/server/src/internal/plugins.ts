import { isAsyncFunction } from "node:util/types";
import type { Plugin, PluginSync } from "../index.js";
// Plugin symbols
const kSkipOverride = Symbol.for("skip-override");

/**
 * Helper to set plugin name for debugging
 */
function setName<T extends Function>(fn: T, name: string): T {
  Object.defineProperty(fn, "name", { value: name, configurable: true });
  return fn;
}

/**
 * Helper to mark plugin as allowing override
 */
function allowOverride<T extends Function>(fn: T): T {
  (fn as any)[kSkipOverride] = true;
  return fn;
}

/**
 * Wraps a plugin function (optional, mainly for consistency)
 */
export function plugin<T = Record<never, never>>(fn: Plugin<T>, name?: string): Plugin<T> {
  const wrapped = name ? setName(fn, name) : fn;
  return allowOverride(wrapped);
}

/**
 * Plugin utilities namespace providing helper functions for creating and composing plugins.
 */
export namespace plugin {
  /**
   * Wraps a sync plugin to automatically call done() if the function doesn't accept it.
   * Prevents plugins from getting stuck if the user forgets to call done().
   */
  function ensureDone<T = Record<never, never>>(fn: PluginSync<T>): PluginSync<T> {
    if (fn.length < 3) {
      return function wrapped(app, opts, done) {
        fn(app, opts, done);
        done();
      };
    }
    return fn;
  }

  /**
   * Creates a sync plugin with automatic done() handling
   */
  export function sync<T = Record<never, never>>(fn: PluginSync<T>, name?: string): PluginSync<T> {
    const wrappedFn = ensureDone(fn);
    const named = name ? setName(wrappedFn, name) : wrappedFn;
    return allowOverride(named);
  }

  /**
   * Type guard to check if a plugin is async or sync.
   */
  function isAsync<Opts = Record<never, never>>(plg: Plugin<Opts> | PluginSync<Opts>): plg is Plugin<Opts> {
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
  export function compose<Opts = Record<never, never>>(...plugins: (Plugin<Opts> | PluginSync<Opts>)[]) {
    const composedName = `compose(${plugins.map((p) => p.name || "anonymous").join(",")})`;
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
    }, composedName);
  }
}
