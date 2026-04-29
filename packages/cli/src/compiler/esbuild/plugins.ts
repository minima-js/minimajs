import type { Plugin } from "esbuild";
import { resolveRunCommand, type Config } from "#/config/index.js";
import { getOutputFilename } from "#/utils/path.js";
import { progress } from "../plugins/progress.js";
import { run } from "../plugins/run/index.js";
import { tsCheckPlugin } from "../plugins/typescript/index.js";

export async function buildPlugins(config: Config, filename: string): Promise<Plugin[]> {
  const { outdir } = config;
  const plugins: Plugin[] = [];

  if (config.watch) {
    if (config.check) {
      plugins.push(tsCheckPlugin(config.tsconfig));
    }
    plugins.push(progress({ dist: outdir, clear: config.reset }));
  }

  if (config.run) {
    const outputFile = getOutputFilename(filename, outdir);

    const { bin, env, args } = resolveRunCommand(config, outputFile);

    plugins.push(run({ bin, args, killSignal: config.killSignal, env }));
  }

  return plugins;
}
