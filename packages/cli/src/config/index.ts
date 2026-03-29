import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config } from "./types.js";
import { defaults } from "./defaults.js";
import type { CliOption } from "../command.js";
import { getTarget, loadPkg } from "./pkg.js";

export type { Config };

export async function loadConfig(cliOption: CliOption = {}): Promise<Config> {
  let config: Partial<Config> = {};
  const packageInfo = loadPkg();

  for (const ext of ["ts", "js"]) {
    try {
      const configPath = join(process.cwd(), `minimajs.config.${ext}`);
      const configUrl = pathToFileURL(configPath).href;
      const module = await import(configUrl);
      config = (module.default ?? module) as Partial<Config>;
      break;
    } catch {
      // no config file found for this extension — try next
    }
  }

  const { main, engines } = packageInfo;
  if (main) {
    config.outdir ??= dirname(resolve(main));
  }

  if (engines?.node) {
    config.target ??= getTarget(engines.node);
  }

  const { grace, ...cliOverrides } = cliOption;

  // grace: false means force kill instead of graceful shutdown
  if (grace === false) {
    config.killSignal = "SIGKILL";
  }

  return {
    ...defaults,
    ...config,
    ...cliOverrides,
  };
}
