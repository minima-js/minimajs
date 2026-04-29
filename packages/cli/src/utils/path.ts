import { resolve, relative, isAbsolute, sep, basename, extname, join } from "node:path";

export function resolveCwd(...parts: string[]): string {
  return resolve(process.cwd(), ...parts);
}

export function relativeId(id: string): string {
  if (!isAbsolute(id)) return id;
  return relative(resolve(), id);
}

export function isCurrentPath(dir: string): boolean {
  return process.cwd() === dir;
}

export function toRelativePath(inputPath: string): string {
  if (isAbsolute(inputPath)) {
    return inputPath;
  }
  if (inputPath.startsWith(".")) return inputPath;
  return `.${sep}${inputPath}`;
}

export function getOutputFilename(src: string, outdir: string, ext = ".js"): string {
  const filename = basename(src, extname(src));
  return toRelativePath(join(outdir, filename) + ext);
}
