import esbuild from "esbuild";
import { buildEsbuildConfig } from "./builder.js";
import type { Config } from "#/config/index.js";

export async function watch(config: Config): Promise<void> {
  const options = await buildEsbuildConfig(config);
  const context = await esbuild.context({ ...options });
  await context.watch();
}
