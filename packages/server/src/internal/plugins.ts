import { kPluginName, kPluginSkipOverride, kPluginSync } from "../symbols.js";
import type { Plugin, PluginCallback, PluginMeta, PluginOptions, PluginSync, Register } from "../interfaces/plugin.js";
import type { App } from "../interfaces/app.js";
// Plugin symbols
/**
 * Helper to set plugin name for debugging
 */

/**
 * Helper to mark plugin as skipping override (wrapped plugins)
 */
function skipOverride(fn: any) {
  (fn as any)[kPluginSkipOverride] = true;
}

export function setName(fn: any, name: string) {
  fn[kPluginName] = name;
}

/**
 * Wraps a plain function into a Plugin with automatic kPluginSkipOverride
 * This prevents the plugin from being encapsulated and allows direct registration
 */
export function plugin<T extends PluginOptions, S = unknown>(fn: PluginCallback<T, S>, name?: string): Plugin<T> {
  setMeta(fn, { name, skipOverride: true });
  return fn as Plugin<T>;
}

export function setMeta(fn: Function, { name, skipOverride: shouldSkipOverride }: PluginMeta): void {
  if (shouldSkipOverride) {
    skipOverride(fn);
  }
  if (name !== undefined) {
    setName(fn, name);
  }
}

/**
 * Plugin utilities namespace providing helper functions for creating and composing plugins.
 */
export namespace plugin {
  export function isSync(fn: Function): fn is PluginSync {
    return kPluginSync in fn;
  }

  export function sync<T>(synced: (app: App<T>) => void) {
    (synced as unknown as PluginSync)[kPluginSync] = true;
    return synced;
  }

  export function getName(fn: Plugin | PluginSync | Register, opts?: { name?: string }): string {
    // Priority: opts.name > fn[kPluginName] > fn.name
    if (opts?.name !== undefined) {
      return opts.name;
    }
    if (kPluginName in fn && typeof fn[kPluginName] === "string") {
      return fn[kPluginName];
    }
    return fn.name || "anonymous";
  }
}
