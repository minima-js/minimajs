/**
 * Symbols used throughout the framework
 * Using Symbol.for() allows cross-realm access and debugging
 */

// Plugin-related symbols
export const kPluginName = Symbol.for("minimajs.plugin.name");
export const kPluginSkipOverride = Symbol.for("minimajs.plugin.skip-override");
export const kPluginSync = Symbol.for("minimajs.plugin.sync");

// Internal symbols
export const kHooks = Symbol.for("minimajs.hooks");
export const kAppDescriptor = Symbol.for("minimajs.app.descriptor");

export const kBody = Symbol.for("minimajs.body");
export const kBodySkip = Symbol.for("minimajs.body.skip");
