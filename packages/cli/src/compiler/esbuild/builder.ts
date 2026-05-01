import type { BuildOptions, Plugin } from "esbuild";
import type { Config } from "#/config/index.js";
import type { CliPlugin } from "#/config/types.js";
import { clean } from "#/utils/fs.js";
import { resolveEntries } from "#/config/entry.js";
import { buildPlugins } from "./plugins.js";

export async function buildEsbuildConfig(
  config: Config,
  { dev, plugins = [] }: { dev: boolean; plugins?: CliPlugin[] }
): Promise<BuildOptions> {
  const { outdir, loader, import: imports = [] } = config;
  const entries = await resolveEntries(config.entry);

  if (config.clean) clean(outdir);
  const pluginEntries = plugins.flatMap((p) => p.entry ?? []);
  const primaryEntry = entries[0] ?? "";
  const internalPlugins = await buildPlugins(config, { filename: primaryEntry, dev });
  const userPlugins = plugins.filter((p) => p.setup != null) as Plugin[];
  const entryPoints = [...entries, ...imports, ...pluginEntries];

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
