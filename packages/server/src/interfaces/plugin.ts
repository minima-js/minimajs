import type { App } from "./app.js";
import type { kPluginName } from "../symbols.js";

export interface PluginOptions {
  prefix?: string;
  name?: string;
  [key: string]: any;
}

export interface Plugin<T extends PluginOptions = PluginOptions> {
  (app: App, opts: T): void | Promise<void>;
  [kPluginName]?: string;
}
