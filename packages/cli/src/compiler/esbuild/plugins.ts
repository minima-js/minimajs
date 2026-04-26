import type { Plugin } from "esbuild";
import type { Config } from "#/config/index.js";
import { getOutputFilename } from "#/utils/path.js";
import { progress } from "../plugins/progress.js";
import { run } from "../plugins/run/index.js";
import { tsCheckPlugin } from "../plugins/typescript/index.js";
import { runtime } from "#/runtime/index.js";

function resolveRunCommand(exec: string | undefined, outputFile: string): { bin: string; args: string[] } {
  const cmd = exec ? exec.replace("[filename]", outputFile) : `${runtime.bin()} ${outputFile}`;
  const [bin, ...args] = cmd.trim().split(/\s+/);
  return { bin: bin!, args };
}

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
    const outputFile = getOutputFilename(filename, outdir, ".js");
    const importArgs = config.import.flatMap((x) => ["--import", getOutputFilename(x, outdir, ".js")]);

    const { bin, args } = resolveRunCommand(config.exec, outputFile);

    if (config.sourcemap && runtime.isNode(bin)) {
      args.unshift("--enable-source-maps");
    }

    args.push(...importArgs);

    plugins.push(run({ bin, args, killSignal: config.killSignal, envFile: config.envFile }));
  }

  return plugins;
}
