import { kSkipOverride } from "../symbols.js";
import type { Plugin, PluginOptions } from "../interfaces/plugin.js";
// Plugin symbols
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
export function plugin<T extends PluginOptions>(fn: Plugin<T>, name?: string): Plugin<T> {
  const wrapped = name ? setName(fn, name) : fn;
  return allowOverride(wrapped);
}

/**
 * Plugin utilities namespace providing helper functions for creating and composing plugins.
 */
export namespace plugin {
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
  export function compose<Opts extends PluginOptions>(...plugins: Plugin<Opts>[]) {
    const composedName = `compose(${plugins.map((p) => p.name || "anonymous").join(",")})`;
    return plugin<Opts>(async function composed(app, opts) {
      for (const plg of plugins) {
        await plg(app, opts);
      }
    }, composedName);
  }
}
