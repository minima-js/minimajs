import type { App } from "./app.js";
import type { kPluginSync, kModuleName, kPlugin } from "../symbols.js";

// Options for register callbacks with prefix support
export type PluginCallback<T extends PluginOptions, S> = (app: App<S>, opts: T) => void | Promise<void>;

export type RegisterOptions<T = {}> = T & {
  prefix?: string;
  name?: string;
};
// Options for register callbacks with prefix support
export type PluginOptions<T = {}> = T & {
  name?: string;
};

// Alias for backward compatibility

// Plugin function (created with plugin wrapper, no prefix in user opts)
export interface Plugin<T extends PluginOptions = PluginOptions> {
  (app: App, opts: T): void | Promise<void>;
  [kModuleName]?: string;
  [kPlugin]: true; // Wrapped plugins skip override
}

// Plugin function (created with plugin wrapper, no prefix in user opts)
export interface PluginSync<T = any> {
  (app: App, opts: T): void;
  [kModuleName]?: string;
  [kPluginSync]: true;
}

// Register callback (plain function, prefix allowed in register options)
export interface Register<T extends RegisterOptions = RegisterOptions> {
  (app: App, opts: T): void | Promise<void>;
  [kModuleName]?: string;
}

// Union of all supported plugin-like callables
export type Registerable<T extends RegisterOptions = RegisterOptions> = Plugin<T> | PluginSync<T> | Register<T>;
