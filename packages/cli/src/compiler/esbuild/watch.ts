import esbuild, { type BuildOptions } from "esbuild";

export async function watch(options: BuildOptions): Promise<void> {
  const context = await esbuild.context({ ...options });
  await context.watch();
}
