import esbuild from "esbuild";
import { buildEsbuildConfig } from "./builder.js";
import type { Config } from "#/config/index.js";
import type { CliPlugin } from "#/config/types.js";

export async function watch(config: Config, plugins: CliPlugin[]): Promise<void> {
  const options = await buildEsbuildConfig(config, { dev: true, plugins });
  const context = await esbuild.context({ ...options });
  await context.watch();
}
