import { dirname, join, resolve } from "node:path";
import type { Config } from "./types.js";
import { defaults } from "./defaults.js";
import type { CliOption } from "../command.js";
import { getTarget, loadPkg } from "./pkg.js";

export type { Config };

export async function loadConfig(cliOption: CliOption = {}): Promise<Config> {
  let config: Partial<Config> = {};

  for (const ext of ["ts", "js"]) {
    try {
      const configPath = join(process.cwd(), `minimajs.config.${ext}`);
      const module = await import(configPath);
      config = (module.default ?? module) as Partial<Config>;
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") throw err;
    }
  }

  const packageInfo = loadPkg();

  const { main, engines } = packageInfo;
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

  return {
    ...defaults,
    ...config,
    ...cliOverrides,
  };
}
