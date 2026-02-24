import { randomUUID } from "node:crypto";
import type { Disk } from "../../types.js";

/** Symbol key used to store the original path in put options metadata */
const ORIGINAL_PATH = Symbol("minimajs.disk.atomicWrite.path");

export interface AtomicWriteOptions {
  /** Directory prefix for temporary files (default: '.tmp/') */
  tempPrefix?: string;
}

/**
 * Atomic write plugin — writes to a temp file first, then renames to the final path.
 * Prevents partial or corrupted files from ever being visible to readers.
 *
 * The original path is tracked via a Symbol key in the put options metadata —
 * no in-memory Map is needed, so there is no risk of a memory leak.
 *
 * @example
 * const disk = createDisk(fsDriver, atomicWrite())
 * await disk.put('important.json', data) // written atomically
 */
export function atomicWrite(options: AtomicWriteOptions = {}) {
  const { tempPrefix = ".tmp/" } = options;

  return (disk: Disk) => {
    disk.hook("put", (path, data, opts) => {
      const tempPath = `${tempPrefix}${randomUUID()}`;
      return [tempPath, data, { ...opts, metadata: { ...opts.metadata, [ORIGINAL_PATH]: path } }];
    });

    disk.hook("stored", (file) => {
      const originalPath = file.metadata[ORIGINAL_PATH] as string | undefined;
      if (!originalPath) return;
      return disk.move(file, originalPath);
    });
  };
}
