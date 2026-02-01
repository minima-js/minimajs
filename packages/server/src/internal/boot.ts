import "./avvio-patch.js";
import avvio, { type Avvio } from "avvio";
import type { App } from "../interfaces/index.js";
import { runHooks } from "../hooks/store.js";
import { kModuleName, kModulesChain, kPlugin } from "../symbols.js";
import { plugin, type PluginOptions, type RegisterOptions, type Registerable } from "../plugin.js";
import { cloneContainer } from "./container.js";

const METADATA_SYMBOLS = [kModuleName, kPlugin];

interface OverrideOptions {
  prefix?: string;
  name?: string;
}

function pluginOverride<S>(app: App<S>, fn: Registerable<S>, options: OverrideOptions = {}): App<S> {
  if (plugin.is(fn)) return app;

  const { prefix: parentPrefix } = app;

  const child: App<S> = Object.create(app, {
    container: {
      value: cloneContainer(app.container),
    },
    prefix: {
      value: options.prefix ? parentPrefix + options.prefix : parentPrefix,
    },
    $parent: {
      value: app,
    },
  });

  child.container[kModulesChain].push(child);
  child.container[kModuleName] = plugin.getName(fn, options);
  return child;
}

/**
 * Copies all registered metadata from source function to target function
 *
 * This ensures that when wrapping functions, all metadata symbols are preserved.
 * The metadata symbols are defined in METADATA_SYMBOLS registry.
 */
export function copyMetadata(source: any, target: any): void {
  for (const symbol of METADATA_SYMBOLS) {
    if (source[symbol] !== undefined) {
      target[symbol] = source[symbol];
    }
  }
  if (!(kModuleName in target)) {
    target[kModuleName] = source.name;
  }
}

/**
 * Wraps an async plugin to run register hooks and preserve metadata
 */
export function wrapPlugin<S>(plugin: Registerable<S>): Registerable<S> {
  async function wrapper(instance: App<S>, wrapperOpts: PluginOptions | RegisterOptions) {
    await runHooks(instance, "register", plugin, wrapperOpts);
    await plugin(instance, wrapperOpts);
  }
  // Copy all metadata from original plugin to wrapper
  copyMetadata(plugin, wrapper);
  return wrapper;
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
