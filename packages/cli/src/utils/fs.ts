import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { readFile, writeFile, mkdir as mkdirAsync } from "node:fs/promises";

/**
 * Returns `true` when `f` exists relative to `process.cwd()`.
 * Resolves the path before checking so bare filenames work as expected.
 */
export function exists(f: string): boolean {
  return existsSync(resolve(process.cwd(), f));
}

/**
 * Reads a file relative to `process.cwd()` and returns its contents as UTF-8 text.
 *
 * **Sub-methods**:
 * - `text.sync`  — synchronous variant
 * - `text.write` — alias for {@link write}
 */
export async function text(name: string): Promise<string> {
  return readFile(resolve(process.cwd(), name), "utf8");
}

/**
 * Writes `content` to `name` relative to `process.cwd()`. Returns `name`.
 *
 * When `opts.ensuredir` is `true` the parent directory is created recursively
 * before writing. `opts.mode` sets the file permission bits.
 *
 * **Sub-methods**:
 * - `write.sync` — synchronous variant
 */
export async function write(name: string, content: string, opts?: { mode?: number; ensuredir?: boolean }): Promise<string> {
  const path = resolve(process.cwd(), name);
  if (opts?.ensuredir) mkdirSync(dirname(path), { recursive: true });
  await writeFile(path, content, { mode: opts?.mode });
  return name;
}

/** Synchronous variant of {@link write}. Blocks until the file is flushed. */
write.sync = function writeSync(name: string, content: string, opts?: { mode?: number; ensuredir?: boolean }): string {
  const path = resolve(process.cwd(), name);
  if (opts?.ensuredir) mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: opts?.mode });
  return name;
};

text.write = write;

/** Synchronous variant of {@link text}. Blocks until the file is fully read. */
text.sync = function syncText(name: string) {
  return readFileSync(resolve(process.cwd(), name), "utf8");
};

/**
 * Creates `path` (relative to `process.cwd()`) and all missing parent
 * directories. Resolves when the directory exists.
 *
 * **Sub-methods**:
 * - `mkdir.sync` — synchronous variant
 */
export async function mkdir(path: string): Promise<void> {
  await mkdirAsync(resolve(process.cwd(), path), { recursive: true });
}

/** Synchronous variant of {@link mkdir}. */
mkdir.sync = function (path: string): void {
  mkdirSync(resolve(process.cwd(), path), { recursive: true });
};

/**
 * Reads and JSON-parses a file relative to `process.cwd()`.
 * The generic `T` lets callers assert the expected shape of the parsed value.
 *
 * **Sub-methods**:
 * - `json.sync` — synchronous variant
 */
export async function json<T = unknown>(name: string) {
  return JSON.parse(await text(name)) as T;
}

/** Synchronous variant of {@link json}. */
json.sync = function readJSONSync<T = unknown>(name: string) {
  return JSON.parse(text.sync(name)) as T;
};

/**
 * Deletes `dest` recursively (if it exists) and recreates it as an empty
 * directory. Silently ignores `ENOENT` errors from the delete step.
 * All paths are resolved relative to `process.cwd()`.
 */
export function clean(dest: string): void {
  dest = resolve(process.cwd(), dest);
  try {
    if (exists(dest)) {
      rmSync(dest, { recursive: true });
    }
    mkdir.sync(dest);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
