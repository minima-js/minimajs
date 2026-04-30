import type { Config, ConfigEnv, ConfigFactory, CliPlugin, PluginsFactory } from "./config/types.js";
import { resolveConfig } from "./config/resolve.js";
import { kFactoryFn } from "./symbols.js";

export type { Config, ConfigEnv, ConfigFactory, ConfigMode, CliPlugin, PluginsFactory } from "./config/types.js";
export { defineCommand } from "citty";
export * from "./runtime/index.js";
export * from "./pkgm/index.js";
export * from "./manifest/index.js";

export function defineConfig(config: Partial<Config>): ConfigFactory;
export function defineConfig(config: (env: ConfigEnv) => Partial<Config>): ConfigFactory;
export function defineConfig(config: Partial<Config> | ((env: ConfigEnv) => Partial<Config>)): ConfigFactory {
  function factory(env: ConfigEnv) {
    if (typeof config === "function") {
      return resolveConfig(config(env));
    }
    return resolveConfig(config);
  }
  factory[kFactoryFn] = true;
  return factory;
}

export function definePlugins(plugins: CliPlugin[]): PluginsFactory;
export function definePlugins(factory: (env: ConfigEnv) => CliPlugin[]): PluginsFactory;
export function definePlugins(input: CliPlugin[] | ((env: ConfigEnv) => CliPlugin[])): PluginsFactory {
  return (env: ConfigEnv) => (typeof input === "function" ? input(env) : input);
}
