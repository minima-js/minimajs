export { run } from "./command.js";
export type { CliOption, Config, ConfigEnv, ConfigFactory, ConfigMode } from "./config/types.js";

import type { Config, ConfigEnv, ConfigFactory } from "./config/types.js";
import { resolveConfig } from "./config/resolve.js";
import { kFactoryFn } from "./symbols.js";

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
