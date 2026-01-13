import "./avvio-patch.js";
import avvio, { type Avvio } from "avvio";
import type { App, Container, Registerable } from "../interfaces/index.js";
import { runHooks } from "../hooks/store.js";
import type { PluginOptions, RegisterOptions } from "../interfaces/plugin.js";
import { kModuleName, kModulesChain, kPlugin } from "../symbols.js";
import { isCallable } from "../utils/callable.js";
import { plugin } from "./plugins.js";

export const METADATA_SYMBOLS = [kModuleName, kPlugin];

type MetadataCarrier = CallableFunction & {
  [kModuleName]?: string;
  [kPlugin]?: boolean;
};

/**
 * Checks if a value has a clone method
 */
function cloneable(value: unknown): value is { clone(): unknown } {
  return isCallable((value as any)?.clone);
}

/**
 * Clones a container by iterating symbol properties and conditionally cloning values
 */
function cloneContainer(container: Container): Container {
  const newContainer: Container = {} as Container;
  // Iterate over symbol properties
  for (const key of Object.getOwnPropertySymbols(container)) {
    const value = container[key];
    if (Array.isArray(value)) {
      newContainer[key] = [...value];
      continue;
    }
    if (cloneable(value)) {
      newContainer[key] = value.clone();
      continue;
    }
    newContainer[key] = value;
  }

  return newContainer;
}

interface OverrideOptions {
  prefix?: string;
  name?: string;
}

function pluginOverride(app: App, fn: Registerable, options: OverrideOptions = {}): App {
  if (plugin.is(fn)) return app;

  const { $prefix: parentPrefix = "", $prefixExclude: parentExclude = [] } = app;

  const child: App = Object.create(app, {
    container: {
      value: cloneContainer(app.container),
    },
    $prefix: {
      value: options.prefix ? parentPrefix + options.prefix : parentPrefix,
    },
    $prefixExclude: {
      value: [...parentExclude],
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
