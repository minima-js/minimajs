import { kModuleName, kPlugin, kPluginSync } from "./symbols.js";
import type { App } from "./interfaces/app.js";

// Options for register callbacks with prefix support
export type PluginCallback< S, T extends PluginOptions> = (app: App<S>, opts: T) => void | Promise<void>;

// Base options for Module - allows prefix
export type RegisterOptions<T = {}> = T & {
  prefix?: string;
  name?: string;
};

// Base options for Plugin
export type PluginOptions<T = {}> = T & {
  name?: string;
};

// Plugin function (created with plugin wrapper, no prefix in user opts)
export interface Plugin<S = unknown, T extends PluginOptions = PluginOptions> {
  (app: App<S>, opts: T): void | Promise<void>;
  [kModuleName]?: string;
  [kPlugin]: true; // Brand to identify Plugin
}

// Sync plugin function - no opts needed
export interface PluginSync<S = unknown> {
  (app: App<S>): void;
  [kPluginSync]: true; // Brand to identify PluginSync
}

// Register callback (plain function, prefix allowed in register options)
export interface Module<S = unknown, T extends RegisterOptions = RegisterOptions> {
  (app: App<S>, opts: T): void | Promise<void>;
  [kModuleName]?: string;
}

// Union of all supported plugin-like callables
export type Registerable<S = any> = (app: App<S>, opts?: any) => void | Promise<void>;

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
export function plugin<S, T extends PluginOptions = PluginOptions>(fn: PluginCallback<S, T>, name?: string): Plugin<S, T> {
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
  export function is<S>(fn: Registerable): fn is Plugin<S> {
    return kPlugin in fn && fn[kPlugin] === true;
  }

  export function isSync<S>(fn: Registerable<S>): fn is PluginSync<S> {
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
