import type { App } from "./app.js";
import type { kPluginSync, kModuleName, kPlugin } from "../symbols.js";

// Options for register callbacks with prefix support
export type PluginCallback<T extends PluginOptions, S> = (app: App<S>, opts: T) => void | Promise<void>;

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
export interface Plugin<S, T extends PluginOptions = PluginOptions> {
  (app: App<S>, opts: T): void | Promise<void>;
  [kModuleName]?: string;
  [kPlugin]: true; // Brand to identify Plugin
}

// Sync plugin function - no opts needed
export interface PluginSync<S> {
  (app: App<S>): void;
  [kPluginSync]: true; // Brand to identify PluginSync
}

// Register callback (plain function, prefix allowed in register options)
export interface Module<S, T extends RegisterOptions = RegisterOptions> {
  (app: App<S>, opts: T): void | Promise<void>;
  [kModuleName]?: string;
}

// Union of all supported plugin-like callables
export type Registerable<S = any> = Plugin<S, any> | PluginSync<S> | Module<S, any>;
