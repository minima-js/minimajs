import "./avvio-patch.js";
import avvio, { type Avvio } from "avvio";
import type { App } from "../interfaces/app.js";
import { pluginOverride } from "./override.js";
import { runHooks } from "../hooks/store.js";
import type { Plugin, Register, PluginOptions, RegisterOptions } from "../interfaces/plugin.js";
import { kPluginName, kPluginSkipOverride } from "../symbols.js";

export const METADATA_SYMBOLS = [kPluginName, kPluginSkipOverride];
/**
 * Copies all registered metadata from source function to target function
 *
 * This ensures that when wrapping functions, all metadata symbols are preserved.
 * The metadata symbols are defined in METADATA_SYMBOLS registry.
 */
function copyMetadata<T extends Function>(source: any, target: T): T {
  for (const symbol of METADATA_SYMBOLS) {
    if (symbol in source && source[symbol] !== undefined) {
      (target as any)[symbol] = source[symbol];
    }
  }
  return target;
}

/**
 * Wraps an async plugin to run register hooks and preserve metadata
 */
export function wrapPlugin<T extends PluginOptions | RegisterOptions = PluginOptions>(
  plugin: Plugin<T> | Register<T>
): Plugin<T> | Register<T> {
  async function wrapper(instance: App, wrapperOpts: T) {
    await runHooks(instance, "register", plugin, wrapperOpts);
    await plugin(instance, wrapperOpts);
  }

  // Copy all metadata from original plugin to wrapper
  return copyMetadata(plugin, wrapper);
}

/**
 * Creates an avvio boot instance for plugin management
 */
export function createBoot(app: App): Avvio<App> {
  const boot = avvio<App>(app, {
    autostart: false,
    expose: { close: "$close", ready: "$ready" },
  });
  boot.override = pluginOverride;
  return boot;
}
