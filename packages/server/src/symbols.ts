/**
 * Symbols used throughout the framework
 * Using Symbol.for() allows cross-realm access and debugging
 */

// Plugin-related symbols
export const kPluginName = Symbol.for("minima.plugin.name");
export const kPluginPrefix = Symbol.for("minima.plugin.prefix");
export const kSkipOverride = Symbol.for("minima.plugin.skip-override");

// Internal symbols
export const kContext = Symbol.for("minima.context");
export const kHooks = Symbol.for("minima.hooks");
export const kHookFactory = Symbol.for("minimajs.hooks.factory");
