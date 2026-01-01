import avvio, { type Avvio } from "avvio";
import type { App } from "../interfaces/app.js";
import { pluginOverride } from "./override.js";
import { runHooks } from "../hooks/store.js";
import type { Plugin, Register, PluginOptions, RegisterOptions } from "../interfaces/plugin.js";
import { kPluginName, kPluginSkipOverride } from "../symbols.js";

/**
 * Plugin wrapper function with metadata symbols
 */
interface PluginWrapper {
  (instance: App, opts: PluginOptions | RegisterOptions): void | Promise<void>;
  [kPluginName]?: string;
  [kPluginSkipOverride]?: boolean;
}

/**
 * Wraps an async plugin to run register hooks and preserve metadata
 */
export function wrapPlugin<T extends PluginOptions | RegisterOptions = PluginOptions>(
  plugin: Plugin<T> | Register<T>
): PluginWrapper {
  const pluginWithMeta = plugin as PluginWrapper;
  const shouldSkip = pluginWithMeta[kPluginSkipOverride];
  const nameOverride = pluginWithMeta[kPluginName];

  async function wrapper(instance: App, wrapperOpts: T) {
    await runHooks(instance, "register", plugin, wrapperOpts);
    await plugin(instance, wrapperOpts);
  }

  // Preserve metadata so pluginOverride function can see it
  const wrappedWithMeta = wrapper as PluginWrapper;
  if (nameOverride !== undefined) {
    wrappedWithMeta[kPluginName] = nameOverride;
  }
  if (shouldSkip) {
    wrappedWithMeta[kPluginSkipOverride] = true;
  }

  return wrappedWithMeta;
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
