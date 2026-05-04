import { dirname, resolve } from "node:path";
import type { Config } from "./types.js";
import { defaults } from "./defaults.js";
import { manifest } from "../manifest/index.js";
import { isCurrentPath } from "../utils/path.js";

export async function resolveConfig(partial: Partial<Config>): Promise<Config> {
  const config = { ...partial };
  const { main, engines } = await manifest.cached();

  if (main) {
    config.outdir ??= dirname(resolve(main));
  }

  if (engines?.node) {
    config.target ??= manifest.target(engines.node);
  }

  const resolved: Config = { ...defaults, ...config };

  if (isCurrentPath(resolved.outdir)) {
    resolved.clean = false;
  }

  return resolved;
}
