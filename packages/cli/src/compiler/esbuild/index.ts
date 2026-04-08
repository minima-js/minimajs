import type { CliOption } from "#/command.js";
import { loadConfig } from "#/config/index.js";
import { resolveEntries } from "#/config/entry.js";
import { logger } from "#/utils/logger.js";
import { build } from "./build.js";
import { buildEsbuildConfig } from "./builder.js";
import { watch } from "./watch.js";

export async function handleAction(opt: CliOption): Promise<void> {
  const config = await loadConfig(opt);
  const entries = await resolveEntries(config.entry);

  // run is dev-only: default to true in watch mode, always off in build mode
  const resolvedConfig = config.watch ? { ...config, run: config.run || true } : { ...config, run: false };

  try {
    const option = await buildEsbuildConfig(entries, resolvedConfig);
    if (resolvedConfig.watch) {
      return watch(option);
    }
    return build(option, resolvedConfig);
  } catch (err) {
    logger.catch(err);
  }
}
