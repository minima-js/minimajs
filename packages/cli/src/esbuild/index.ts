import type { CliOption } from "../command.js";
import { loadConfig } from "../config/index.js";
import { handleError } from "../utils/error-handler.js";
import { build } from "./build.js";
import { buildEsbuildConfig } from "./builder.js";
import { watch } from "./watch.js";
import { extname } from "node:path";

function isTypescript(filename?: string): boolean {
  return !!filename && extname(filename) === ".ts";
}

export async function handleAction(filename: string, opt: CliOption): Promise<void> {
  if (!isTypescript(filename)) {
    opt.ignoreTypes = true;
  }
  const config = await loadConfig(opt);
  try {
    const option = await buildEsbuildConfig(filename, config);
    if (config.watch) {
      return watch(option);
    }
    return build(option, config);
  } catch (err) {
    handleError(err);
  }
}
