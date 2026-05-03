import { resolve, relative, isAbsolute, sep, basename, extname, join } from "node:path";

/** Resolves one or more path segments relative to `process.cwd()`. */
export function resolveCwd(...parts: string[]): string {
  return resolve(process.cwd(), ...parts);
}

/**
 * Returns a path relative to `process.cwd()`.
 * If `id` is already relative it is returned unchanged.
 */
export function relativeId(id: string): string {
  if (!isAbsolute(id)) return id;
  return relative(resolve(), id);
}

/** Returns `true` when `dir` is exactly equal to `process.cwd()`. */
export function isCurrentPath(dir: string): boolean {
  return process.cwd() === dir;
}

/**
 * Ensures the path has an explicit `./` prefix so it is unambiguously
 * relative. Absolute paths are returned as-is.
 */
export function toRelativePath(inputPath: string): string {
  if (isAbsolute(inputPath)) {
    return inputPath;
  }
  if (inputPath.startsWith(".")) return inputPath;
  return `.${sep}${inputPath}`;
}

/**
 * Derives the output filename for a source file placed into `outdir`.
 * Strips the original extension and replaces it with `ext` (default `".js"`),
 * then prefixes the result with `./` via {@link toRelativePath}.
 */
export function getOutputFilename(src: string, outdir: string, ext = ".js"): string {
  const filename = basename(src, extname(src));
  return toRelativePath(join(outdir, filename) + ext);
}
