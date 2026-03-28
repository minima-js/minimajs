import type { BuildOptions } from "esbuild";
import type { Config } from "../config/index.js";
import { clean } from "../utils/fs.js";
import { isCurrentPath } from "../utils/path.js";
import { buildPlugins } from "./plugins.js";

export async function buildEsbuildConfig(filename: string, config: Config): Promise<BuildOptions> {
  const { outdir, loader } = config;
  if (isCurrentPath(outdir)) config.clean = false;
  if (config.clean) clean(outdir);
  const plugins = await buildPlugins(config, filename);
  const entryPoints = [filename, ...config.import];
  const buildConfig: BuildOptions = {
    entryPoints,
    bundle: true,
    platform: "node",
    format: "esm",
    splitting: true,
    outExtension: { ".js": ".js" },
    outdir,
    minify: config.minify,
    sourcemap: config.sourcemap,
    tsconfig: config.tsconfig,
    metafile: true,
    plugins,
    loader,
  };
  if (config.target) {
    buildConfig.target = config.target;
  }
  return buildConfig;
}
