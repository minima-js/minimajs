import type { Handler } from "../../interfaces/index.js";
import type { HTTPMethod } from "find-my-way";
import type { Plugin, PluginSync } from "../../plugin.js";
import type { Module } from "../../plugin.js";

export interface Meta<S = any> {
  name?: string;
  prefix?: string;
  plugins?: (Plugin<S> | PluginSync<S>)[];
}

export interface ImportedModule {
  dir: string;
  meta: Meta;
  routes?: Routes;
  module?: Module;
}

export interface ModuleDiscoveryOptions {
  root?: string;
  index?: string;
  scanner?: ModuleScanner;
}

export type ModuleScanner = (dir: string, index: string) => AsyncGenerator<string>;

export type Routes<S = any> = Record<`${HTTPMethod} ${string}`, Handler<S>>;
