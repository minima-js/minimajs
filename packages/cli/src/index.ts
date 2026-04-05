export { run } from "./command.js";
export type { CliOption, Config } from "./config/types.js";

import type { Config } from "./config/types.js";

interface ConfigEnv {
  production: boolean;
  watch: boolean;
}

type ConfigFactory = (env: ConfigEnv) => Partial<Config>;

export function defineConfig(config: Partial<Config>): Partial<Config>;
export function defineConfig(config: ConfigFactory): ConfigFactory;
export function defineConfig(config: Partial<Config> | ConfigFactory): Partial<Config> | ConfigFactory {
  return config;
}
