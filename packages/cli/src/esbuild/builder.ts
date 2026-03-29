import type { BuildOptions } from "esbuild";
import type { Config } from "../config/index.js";
import { clean } from "../utils/fs.js";
import { isCurrentPath } from "../utils/path.js";
import { buildPlugins } from "./plugins.js";

export async function buildEsbuildConfig(entries: string[], config: Config): Promise<BuildOptions> {
  const { outdir, loader } = config;
  if (isCurrentPath(outdir)) config.clean = false;
  if (config.clean) clean(outdir);
  const primaryEntry = entries[0] ?? "";
  const plugins = await buildPlugins(config, primaryEntry);
  const entryPoints = [...entries, ...config.import];

  // Determine if we have multiple entries — if so, use outbase to preserve directory structure
  const isMultiEntry = entries.length > 1;

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
    // splitting is incompatible with outbase multi-entry; only enable for single entry
    ...(isMultiEntry ? { outbase: "src" } : { splitting: true }),
  };
  if (config.target) {
    buildConfig.target = config.target;
  }
  return buildConfig;
}
