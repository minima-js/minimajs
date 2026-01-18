/**
 * Symbols used throughout Minima.js framework.
 *
 * Provides well-known symbols for internal framework operations and plugin metadata.
 * Using Symbol() allows cross-realm access and debugging.
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
export const kModuleName = Symbol("minimajs.module.name");

/**
 * Symbol to mark plugins that should skip context override.
 * Used for plugins that need to maintain parent context.
 */
export const kPlugin = Symbol("minimajs.plugin");

/**
 * Symbol to mark synchronous plugins.
 * Used for plugins that don't require async initialization.
 */
export const kPluginSync = Symbol("minimajs.plugin.sync");

/**
 * Symbol for accessing registered hooks.
 */
export const kHooks = Symbol("minimajs.hooks");

/**
 * Symbol for maintaining module chain (root -> ... -> child) in container.
 */
export const kModulesChain = Symbol("minimajs.modules.chain");

/**
 * Symbol for app descriptor metadata.
 * @internal
 */
export const kAppDescriptor = Symbol("minimajs.app.descriptor");

/**
 * Symbol for request body storage in context.
 * Used by body parser plugin to store parsed body.
 */
export const kBody = Symbol("minimajs.body");

/**
 * Symbol to mark requests that should skip body parsing.
 * Used to opt-out of automatic body parsing for specific routes.
 */
export const kBodySkip = Symbol("minimajs.body.skip");

export const kIpAddr = Symbol("ipAddr");
