/**
 * Symbols used throughout MinimaJS framework.
 *
 * Provides well-known symbols for internal framework operations and plugin metadata.
 * Using Symbol.for() allows cross-realm access and debugging.
 *
 * @module @minimajs/server/symbols
 *
 * @example
 * ```typescript
 * import { kPluginName, kPluginSync } from '@minimajs/server/symbols';
 *
 * function myPlugin() {
 *   return {
 *     [kPluginName]: 'my-plugin',
 *     [kPluginSync]: true,
 *     // plugin implementation
 *   };
 * }
 * ```
 */

/**
 * Symbol for plugin name metadata.
 * Used to identify plugins for debugging and error messages.
 */
export const kPluginName = Symbol.for("minimajs.plugin.name");

/**
 * Symbol to mark plugins that should skip context override.
 * Used for plugins that need to maintain parent context.
 */
export const kPluginSkipOverride = Symbol.for("minimajs.plugin.skip-override");

/**
 * Symbol to mark synchronous plugins.
 * Used for plugins that don't require async initialization.
 */
export const kPluginSync = Symbol.for("minimajs.plugin.sync");

/**
 * Symbol for accessing registered hooks.
 * @internal
 */
export const kHooks = Symbol.for("minimajs.hooks");

/**
 * Symbol for app descriptor metadata.
 * @internal
 */
export const kAppDescriptor = Symbol.for("minimajs.app.descriptor");

/**
 * Symbol for request body storage in context.
 * Used by body parser plugin to store parsed body.
 */
export const kBody = Symbol.for("minimajs.body");

/**
 * Symbol to mark requests that should skip body parsing.
 * Used to opt-out of automatic body parsing for specific routes.
 */
export const kBodySkip = Symbol.for("minimajs.body.skip");
