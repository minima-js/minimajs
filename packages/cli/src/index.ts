export { run } from "./command.js";
export type { CliOption, Config } from "./config/types.js";

import type { Config } from "./config/types.js";

export function defineConfig(config: Partial<Config>): Config {
  return config as Config;
}
