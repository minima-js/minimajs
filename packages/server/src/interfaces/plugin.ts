import type { App } from "./app.js";
import type { kPluginSync, kPluginName, kPluginSkipOverride } from "../symbols.js";

export interface PluginOptions {
  prefix?: string;
  name?: string;
  [key: string]: any;
}

export interface Plugin<T extends PluginOptions = PluginOptions> {
  (app: App, opts: T): void | Promise<void>;
  [kPluginName]?: string;
  [kPluginSkipOverride]?: boolean;
  [kPluginSync]?: boolean;
}

export interface PluginMeta {
  skipOverride?: boolean;
  name?: string;
}
