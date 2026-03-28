import type { Plugin } from "esbuild";
import type { Config } from "../config/index.js";
import { getOutputFilename } from "../utils/path.js";
import { progress } from "../plugins/progress.js";
import { run } from "../plugins/run/index.js";
import { tsCheckPlugin } from "../plugins/typescript/index.js";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import { yellow } from "../utils/colors.js";
import { log } from "../utils/logging.js";

export async function buildPlugins(config: Config, filename: string): Promise<Plugin[]> {
  const { outdir, ext: outExtension } = config;
  const plugins: Plugin[] = [];

  // Add polyfill plugins
  for (const name of config.polyfills) {
    if (name === "cjs") {
      const { cjs } = await import("../plugins/cjs-polyfill.js");
      plugins.push(cjs());
    }
  }

  plugins.push(nodeExternalsPlugin({ allowList: config.external?.include }));

  if (config.watch) {
    if (!config.ignoreTypes) plugins.push(tsCheckPlugin());
    plugins.push(progress({ dist: outdir, clear: config.reset }));
  }

  if (config.envFile && !config.run) {
    log(yellow("Warning: --env-file has no effect without --run option"));
  }

  if (config.run) {
    if (config.run === true) {
      config.run = getOutputFilename(filename, outdir, outExtension);
    }
    const nodeOptions = [...config.nodeOptions];
    config.import.forEach((x) => {
      const fname = getOutputFilename(x, outdir, outExtension);
      nodeOptions.push("--import", fname);
    });
    plugins.push(
      run({
        nodeOptions,
        filename: config.run,
        killSignal: config.killSignal,
        envFile: config.envFile,
      })
    );
  }

  return plugins;
}
