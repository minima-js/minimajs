import { stderr as std } from "node:process";
import { bold, green, red } from "./colors.js";
import type { Metafile } from "esbuild";
import ms from "pretty-ms";
import prettyBytes from "pretty-bytes";

function printTimings(start: number): string {
  return bold(ms(Date.now() - start));
}

function getBytes(metafile: Metafile): string {
  const size = Object.entries(metafile.outputs).reduce((acc, file) => acc + file[1].bytes, 0);
  return prettyBytes(size);
}

export const stderr = (...parameters: readonly unknown[]): boolean => {
  return std.write(`${parameters.join("")}\n`);
};

// eslint-disable-next-line no-console
export const log = console.log;
// eslint-disable-next-line no-console
export const clear = console.clear;

export function successMessage(outdir: string, metafile: Metafile, startedAt: number): string {
  const timings = printTimings(startedAt);
  const bytes = getBytes(metafile);
  return green(`created ${bold(outdir)} (${bytes}) in ${timings}`);
}

export function errorMessage(errors: unknown[]): string {
  return red(`Build failed. ${errors.length} error${errors.length > 1 ? "s" : ""}`);
}
