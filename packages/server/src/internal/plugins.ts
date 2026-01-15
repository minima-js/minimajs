import { kModuleName, kPlugin, kPluginSync } from "../symbols.js";
import type { Plugin, PluginCallback, PluginOptions, PluginSync, Registerable } from "../interfaces/plugin.js";
import type { App } from "../interfaces/app.js";

// Plugin symbols
/**
 * Helper to set plugin name for debugging
 */

/**
 * Helper to mark plugin as skipping override (wrapped plugins)
 */
function skipOverride(fn: any) {
  fn[kPlugin] = true;
}

function setName(fn: any, name: string) {
  fn[kModuleName] = name;
}

/**
 * Wraps a plain function into a Plugin with automatic kPluginSkipOverride
 * This prevents the plugin from being encapsulated and allows direct registration
 */
export function plugin<S = any, T extends PluginOptions = PluginOptions>(
  fn: PluginCallback<T, S>,
  name?: string
): Plugin<S, T> {
  skipOverride(fn);
  if (name !== undefined) {
    setName(fn, name);
  }
  return fn as Plugin<S, T>;
}

/**
 * Plugin utilities namespace providing helper functions for creating and composing plugins.
 */
export namespace plugin {
  export function is<S = any>(fn: Registerable): fn is Plugin<S> {
    return kPlugin in fn && fn[kPlugin] === true;
  }

  export function isSync<S = any>(fn: Registerable): fn is PluginSync<S> {
    return kPluginSync in fn;
  }

  export function sync<S>(synced: (app: App<S>) => void): PluginSync<S> {
    (synced as PluginSync<S>)[kPluginSync] = true;
    return synced as PluginSync<S>;
  }

  export function getName(fn: Registerable, opts?: { name?: string }): string {
    // Priority: opts.name > fn[kPluginName] > fn.name
    if (opts?.name !== undefined) {
      return opts.name;
    }
    if (kModuleName in fn && typeof fn[kModuleName] === "string") {
      return fn[kModuleName];
    }
    return fn.name || "anonymous";
  }
}
