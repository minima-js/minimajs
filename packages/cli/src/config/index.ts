import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config, ConfigFactory, ConfigEnv } from "./types.js";
import { resolveConfig } from "./resolve.js";
import type { CliOption } from "../command.js";
import { exists } from "../utils/fs.js";

export type { Config };

export async function loadConfig(cliOption: CliOption = {}): Promise<Config> {
  const env: ConfigEnv = { build: !!cliOption.build, watch: !!cliOption.watch };

  let factory: ConfigFactory = () => resolveConfig({});

  for (const ext of ["js", "ts"]) {
    const configPath = join(process.cwd(), `minimajs.config.${ext}`);
    if (!exists(configPath)) continue;
    const module = await import(pathToFileURL(configPath).href);
    factory = module.default ?? module;
    break;
  }

  const config = await factory(env);

  const { grace, build: _build, ...cliOverrides } = cliOption;

  if (grace === false) {
    config.killSignal = "SIGKILL";
  }

  return { ...config, ...cliOverrides };
}
