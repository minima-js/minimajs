import type { App } from "./app.js";
import type { kHookFactory, kPluginName, kSkipOverride } from "../symbols.js";

export interface PluginOptions {
  prefix?: string;
  name?: string;
  [key: string]: any;
}

export interface Plugin<T extends PluginOptions = PluginOptions> {
  (app: App, opts: T): void | Promise<void>;
  [kPluginName]?: string;
  [kSkipOverride]?: boolean;
  [kHookFactory]?: boolean;
}

export interface PluginMeta {
  skipOverride?: boolean;
  name?: string;
}
