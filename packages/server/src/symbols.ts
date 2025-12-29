/**
 * Symbols used throughout the framework
 * Using Symbol.for() allows cross-realm access and debugging
 */

// Plugin-related symbols
export const kPluginName = Symbol.for("minima.plugin.name");
export const kPluginSkipOverride = Symbol.for("minima.plugin.skip-override");
export const kPluginSync = Symbol.for("minimajs.plugin.sync");

// Internal symbols
export const kContext = Symbol.for("minima.context");
export const kHooks = Symbol.for("minima.hooks");
