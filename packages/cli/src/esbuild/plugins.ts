import type { Plugin } from "esbuild";
import type { Config } from "../config/index.js";
import type { Runtime } from "../config/types.js";
import { getOutputFilename } from "../utils/path.js";
import { progress } from "../plugins/progress.js";
import { run } from "../plugins/run/index.js";
import { tsCheckPlugin } from "../plugins/typescript/index.js";
import { yellow } from "../utils/colors.js";
import { log } from "../utils/logging.js";

function resolveBin(runtime: Runtime | undefined): string {
  const inBun = typeof process.versions.bun === "string";
  if (runtime === "bun") return inBun ? process.execPath : "bun";
  return inBun ? "node" : process.execPath;
}

function resolveRunCommand(
  runConfig: string | true,
  outputFile: string,
  runtime: Runtime | undefined
): { bin: string; args: string[] } {
  if (runConfig === true) {
    return { bin: resolveBin(runtime), args: [outputFile] };
  }

  const cmd = runConfig.includes("[filename]") ? runConfig.replace("[filename]", outputFile) : `${runConfig} ${outputFile}`;

  const [bin, ...args] = cmd.trim().split(/\s+/);
  return { bin: bin!, args };
}

export async function buildPlugins(config: Config, filename: string): Promise<Plugin[]> {
  const { outdir } = config;
  const plugins: Plugin[] = [];

  if (config.watch) {
    if (!config.ignoreTypes) plugins.push(tsCheckPlugin(config.tsconfig));
    plugins.push(progress({ dist: outdir, clear: config.reset }));
  }

  if (config.envFile && !config.run) {
    log(yellow("Warning: --env-file has no effect without --run option"));
  }

  if (config.run) {
    const outputFile = getOutputFilename(filename, outdir, ".js");
    const importArgs = config.import.flatMap((x) => ["--import", getOutputFilename(x, outdir, ".js")]);

    const { bin, args } = resolveRunCommand(config.run, outputFile, config.runtime);
    args.push(...importArgs);

    plugins.push(run({ bin, args, killSignal: config.killSignal, envFile: config.envFile }));
  }

  return plugins;
}
