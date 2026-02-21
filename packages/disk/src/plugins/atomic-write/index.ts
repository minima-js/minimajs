import type { AtomicWritesOptions } from "../../pipelines.js";
import type { Disk } from "../../types.js";

/**
 * Atomic writes pipeline - uses temp file + move for atomicity
 */

export function atomicWrites(options: AtomicWritesOptions = {}) {
  const { tempPrefix = ".tmp-" } = options;

  return (disk: Disk) => {
    disk.hook("put", async (ctx) => {
      // Store original path
      const originalPath = ctx.path;
      const tempPath = `${tempPrefix}${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Modify path to temp location
      ctx.path = tempPath;

      // After stored, move to final location
      disk.hook("stored", async (file) => {
        if (file.href.includes(tempPath)) {
          // Move from temp to final location
          await disk.move(tempPath, originalPath);
        }
      });
    });
  };
}
