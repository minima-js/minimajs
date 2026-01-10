import type { App } from "./interfaces/index.js";
import type { RegisterOptions, Registerable, Plugin } from "./interfaces/plugin.js";
import { copyMetadata } from "./internal/boot.js";
import { plugin } from "./internal/plugins.js";

/**
 * Composes multiple plugins/modules into a single plugin that registers all of them sequentially.
 *
 * @param plugins - Array of plugins or modules to compose
 * @returns A single plugin that registers all provided plugins in order
 *
 * @example
 * ```typescript
 * const dbPlugin = compose(
 *   hook("ready", async () => await db.connect()),
 *   hook("close", async () => await db.close())
 * );
 *
 * app.register(dbPlugin);
 * ```
 *
 * @example
 * ```typescript
 * // Compose multiple feature modules
 * const apiModule = compose(
 *   authModule,
 *   usersModule,
 *   postsModule
 * );
 *
 * app.register(apiModule);
 * ```
 */
export function compose<T extends RegisterOptions = RegisterOptions>(...plugins: Registerable<T>[]): Plugin<T> {
  const composedName = `compose(${plugins.map((p) => p.name || "anonymous").join(",")})`;
  return plugin<T>(async function composed(app, opts) {
    for (const plg of plugins) {
      await plg(app, opts);
    }
  }, composedName);
}

export namespace compose {
  /**
   * Creates a higher-order function that applies multiple plugins to a module.
   * This allows you to pre-configure a set of plugins and apply them to different modules.
   *
   * @param plugins - Array of plugins to be applied
   * @returns A function that takes a module and returns a new module with all plugins applied
   *
   * @example
   * ```typescript
   * // Create a composer with common plugins
   * const withAuth = compose.create(
   *   authPlugin,
   *   loggingPlugin
   * );
   *
   * // Apply to different modules
   * const usersModule = (app: App) => {
   *   app.get("/users", () => ({ users: [] }));
   * });
   *
   * app.register(withAuth(usersModule));
   * ```
   */
  export function create<T extends RegisterOptions = RegisterOptions>(...plugins: Registerable<T>[]) {
    return function applyPlugins(module: Registerable<T>) {
      function composed(app: App, opts: T) {
        plugins.forEach((plug) => app.register(plug, opts));
        return module(app, opts);
      }
      copyMetadata(module, composed);
      return composed as Registerable<T>;
    };
  }
}
