import "./avvio-patch.js";
import avvio, { type Avvio } from "avvio";
import type { App } from "../interfaces/app.js";
import { pluginOverride } from "./override.js";
import { runHooks } from "../hooks/store.js";
import type { PluginOptions, RegisterOptions, Registerable } from "../interfaces/plugin.js";
import { kModuleName, kPlugin } from "../symbols.js";

export const METADATA_SYMBOLS = [kModuleName, kPlugin];

type MetadataCarrier = CallableFunction & {
  [kModuleName]?: string;
  [kPlugin]?: boolean;
};

/**
 * Copies all registered metadata from source function to target function
 *
 * This ensures that when wrapping functions, all metadata symbols are preserved.
 * The metadata symbols are defined in METADATA_SYMBOLS registry.
 */
export function copyMetadata<T extends MetadataCarrier, S extends MetadataCarrier>(source: S, target: T): T {
  for (const symbol of METADATA_SYMBOLS) {
    if (symbol in source && (source as any)[symbol] !== undefined) {
      (target as any)[symbol] = (source as any)[symbol];
    }
  }
  if (!(kModuleName in target)) {
    (target as any)[kModuleName] = source.name;
  }
  return target;
}

/**
 * Wraps an async plugin to run register hooks and preserve metadata
 */
export function wrapPlugin<T extends PluginOptions | RegisterOptions = PluginOptions>(
  plugin: Registerable<T>
): Registerable<T> {
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
  boot.override = pluginOverride as unknown as typeof boot.override;
  return boot;
}
