import chalk from "chalk";
import type { Metafile } from "esbuild";
import ms from "pretty-ms";
import prettyBytes from "pretty-bytes";

function getBytes(metafile: Metafile): number {
  return Object.values(metafile.outputs).reduce((acc, o) => acc + o.bytes, 0);
}

function success(outdir: string, metafile: Metafile, startedAt: number): string {
  const timing = chalk.bold(ms(Date.now() - startedAt));
  const bytes = prettyBytes(getBytes(metafile));
  return chalk.green(`created ${chalk.bold(outdir)} (${bytes}) in ${timing}`);
}

function error(errors: unknown[]): string {
  return chalk.red(`Build failed. ${errors.length} error${errors.length > 1 ? "s" : ""}`);
}

export const format = { success, error };
