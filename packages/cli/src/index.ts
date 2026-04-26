export { run } from "./command.js";
export type { CliOption, Config, ConfigEnv, ConfigFactory } from "./config/types.js";

import type { Config, ConfigEnv, ConfigFactory } from "./config/types.js";
import { resolveConfig } from "./config/resolve.js";

export function defineConfig(config: Partial<Config>): ConfigFactory;
export function defineConfig(config: (env: ConfigEnv) => Partial<Config>): ConfigFactory;
export function defineConfig(config: Partial<Config> | ((env: ConfigEnv) => Partial<Config>)): ConfigFactory {
  if (typeof config === "function") {
    return (env: ConfigEnv) => resolveConfig(config(env));
  }
  return () => resolveConfig(config);
}
