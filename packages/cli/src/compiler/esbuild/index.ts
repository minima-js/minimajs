import type { CliOption } from "../../command.js";
import { loadConfig } from "../../config/index.js";
import { resolveEntries } from "../../config/entry.js";
import { handleError } from "../../utils/error-handler.js";
import { build } from "./build.js";
import { buildEsbuildConfig } from "./builder.js";
import { watch } from "./watch.js";

export async function handleAction(opt: CliOption): Promise<void> {
  const config = await loadConfig(opt);
  const entries = await resolveEntries(config.entry);

  // dev mode: type checking is a separate command, default run to true
  const resolvedConfig = config.watch ? { ...config, run: config.run || true } : config;

  try {
    const option = await buildEsbuildConfig(entries, resolvedConfig);
    if (resolvedConfig.watch) {
      return watch(option);
    }
    return build(option, resolvedConfig);
  } catch (err) {
    handleError(err);
  }
}
