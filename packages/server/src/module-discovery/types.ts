import type { Plugin, PluginSync } from "../plugin.js";
import type { Module } from "../plugin.js";

export interface Meta<S = any> {
  name?: string;
  prefix?: string;
  plugins?: (Plugin<S> | PluginSync<S>)[];
}

export interface ImportedModule {
  dir: string;
  meta: Meta;
  module?: Module;
}

export interface ModuleDiscoveryOptions {
  root?: string;
  index?: string;
}
