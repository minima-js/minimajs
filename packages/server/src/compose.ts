import type { App } from "./interfaces/index.js";
import type { RegisterOptions, Registerable, Plugin, PluginOptions } from "./interfaces/plugin.js";
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
export function compose<S, T extends PluginOptions = PluginOptions>(...plugins: Registerable<S>[]): Plugin<S, T> {
  const composedName = `compose(${plugins.map((p) => p.name || "anonymous").join(",")})`;
  return plugin<S, T>(async function composed(app, opts) {
    for (const plg of plugins) {
      // Check if plugin is sync (no opts) or async (with opts)
      if (plugin.isSync(plg)) {
        plg(app);
      } else {
        await plg(app, opts);
      }
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
  export function create<S>(...plugins: Registerable<S>[]) {
    return function applyPlugins(mod: Registerable<S>): Registerable<S> {
      function composed(app: App<S>, opts: PluginOptions | RegisterOptions) {
        plugins.forEach((plug) => {
          if (plugin.isSync(plug)) {
            app.register(plug);
          } else {
            app.register(plug, opts);
          }
        });

        if (plugin.isSync(mod)) {
          return mod(app);
        }
        return mod(app, opts);
      }
      copyMetadata(mod, composed);
      return composed as Registerable<S>;
    };
  }
}
