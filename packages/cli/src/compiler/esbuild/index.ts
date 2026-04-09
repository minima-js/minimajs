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

  try {
    const option = await buildEsbuildConfig(entries, config);
    if (config.watch) {
      return watch(option);
    }
    return build(option, config);
  } catch (err) {
    logger.catch(err);
  }
}
