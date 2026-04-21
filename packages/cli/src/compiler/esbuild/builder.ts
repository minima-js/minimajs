import type { BuildOptions, Plugin } from "esbuild";
import type { Config } from "#/config/index.js";
import { clean } from "#/utils/fs.js";
import { buildPlugins } from "./plugins.js";

export async function buildEsbuildConfig(entries: string[], config: Config): Promise<BuildOptions> {
  const { outdir, loader } = config;
  if (config.clean) clean(outdir);

  const pluginEntries = config.plugins?.flatMap((p) => p.entry ?? []) ?? [];
  const primaryEntry = entries[0] ?? "";
  const internalPlugins = await buildPlugins(config, primaryEntry);
  const userPlugins = (config.plugins ?? []).filter((p) => p.setup != null) as Plugin[];
  const entryPoints = [...entries, ...config.import, ...pluginEntries];

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
    plugins: [...internalPlugins, ...userPlugins],
    loader,
    splitting: true,
    ...config.esbuild,
  };
  if (config.target) {
    buildConfig.target = config.target;
  }
  return buildConfig;
}
