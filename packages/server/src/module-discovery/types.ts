import type { Module } from "../plugin.js";

export interface Meta {
  name?: string;
  prefix?: string;
}

export interface ImportedModule {
  dir: string;
  meta: Meta;
  module?: Module;
}

export interface ModuleDiscoveryOptions {
  modulesPath?: string;
  name: string;
}
