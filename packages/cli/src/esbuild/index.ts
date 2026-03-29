import type { CliOption } from "../command.js";
import { loadConfig } from "../config/index.js";
import { resolveEntries } from "../config/entry.js";
import { handleError } from "../utils/error-handler.js";
import { build } from "./build.js";
import { buildEsbuildConfig } from "./builder.js";
import { watch } from "./watch.js";
import { extname } from "node:path";

function isTypescript(filename: string): boolean {
  return extname(filename) === ".ts";
}

export async function handleAction(opt: CliOption): Promise<void> {
  const config = await loadConfig(opt);
  const entries = await resolveEntries(config.entry, config.modulePattern);

  if (!entries.some(isTypescript)) {
    config.ignoreTypes = true;
  }

  try {
    const option = await buildEsbuildConfig(entries, config);
    if (config.watch) {
      return watch(option);
    }
    return build(option, config);
  } catch (err) {
    handleError(err);
  }
}
