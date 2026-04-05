import type { BuildOptions } from "esbuild";
import type { Config } from "../../config/index.js";
import { clean } from "../../utils/fs.js";
import { buildPlugins } from "./plugins.js";

export async function buildEsbuildConfig(entries: string[], config: Config): Promise<BuildOptions> {
  const { outdir, loader } = config;
  if (config.clean) clean(outdir);
  const primaryEntry = entries[0] ?? "";
  const plugins = await buildPlugins(config, primaryEntry);
  const entryPoints = [...entries, ...config.import];

  const buildConfig: BuildOptions = {
    entryPoints,
    bundle: true,
    packages: "external",
    platform: "node",
    target: "esnext",
    format: "esm",
    outdir,
    minify: config.minify,
    sourcemap: config.sourcemap,
    tsconfig: config.tsconfig,
    metafile: true,
    plugins,
    loader,
    splitting: true,
  };
  if (config.target) {
    buildConfig.target = config.target;
  }
  return buildConfig;
}
