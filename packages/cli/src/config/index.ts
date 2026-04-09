import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config } from "./types.js";
import { defaults } from "./defaults.js";
import type { CliOption } from "../command.js";
import { getTarget, manifest } from "./pkg.js";
import { exists } from "../utils/fs.js";
import { isCurrentPath } from "../utils/path.js";

export type { Config };

export async function loadConfig(cliOption: CliOption = {}): Promise<Config> {
  let config: Partial<Config> = {};

  for (const ext of ["js", "ts"]) {
    const configPath = join(process.cwd(), `minimajs.config.${ext}`);
    if (!exists(configPath)) continue;

    const module = await import(pathToFileURL(configPath).href);
    const raw = module.default ?? module;
    const build = !!cliOption.build;
    const watch = !!cliOption.watch;
    config =
      typeof raw === "function"
        ? (raw as (env: { build: boolean; watch: boolean }) => Partial<Config>)({ build, watch })
        : (raw as Partial<Config>);
    break;
  }

  const { main, engines } = await manifest();

  if (main) {
    config.outdir ??= dirname(resolve(main));
  }

  if (engines?.node) {
    config.target ??= getTarget(engines.node);
  }

  const { grace, ...rawOverrides } = cliOption;

  // grace: false means force kill instead of graceful shutdown
  if (grace === false) {
    config.killSignal = "SIGKILL";
  }

  // Only apply overrides that were explicitly set (not undefined)
  const cliOverrides = Object.fromEntries(Object.entries(rawOverrides).filter(([, v]) => v !== undefined));

  const resolved: Config = {
    ...defaults,
    ...config,
    ...cliOverrides,
  };

  if (isCurrentPath(resolved.outdir)) {
    resolved.clean = false;
  }

  return resolved;
}
