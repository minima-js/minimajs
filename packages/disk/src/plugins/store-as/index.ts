import { randomUUID } from "node:crypto";
import { extname, basename } from "node:path";
import type { Disk } from "../../types.js";

export type NameStrategy = "uuid" | "uuid-original";
export type NameGenerator = (file: File) => string | Promise<string>;

/**
 * storeAs plugin — customize how filenames are generated when a `File` object is passed to `put`.
 *
 * By default, `disk.put(file)` uses the file's original name as-is. Use this plugin
 * to automatically rename uploaded files using a UUID strategy or a custom generator.
 *
 * - `"uuid"` — generates a UUID filename, preserving the extension: `550e8400.jpg`
 * - `"uuid-original"` — prefixes the UUID before the original name: `550e8400-photo.jpg`
 * - custom function — full control over the generated name (sync or async)
 *
 * When the name is changed, the original filename is preserved in `file.metadata.originalName`.
 *
 * @example
 * // UUID filename (default strategy)
 * const disk = createDisk({ driver }, storeAs())
 * await disk.put(new File(['…'], 'photo.jpg')) // stored as "550e8400-….jpg"
 *
 * @example
 * // UUID prefix + original name
 * const disk = createDisk({ driver }, storeAs("uuid-original"))
 * await disk.put(new File(['…'], 'photo.jpg')) // stored as "550e8400-…-photo.jpg"
 *
 * @example
 * // Custom generator — year-based path
 * const disk = createDisk({ driver }, storeAs(file => `${new Date().getFullYear()}/${randomUUID()}${extname(file.name)}`))
 *
 * @example
 * // Async custom generator — content hash
 * const disk = createDisk({ driver }, storeAs(async file => {
 *   const hash = await sha256(await file.arrayBuffer());
 *   return `${hash}${extname(file.name)}`;
 * }))
 */
export function storeAs(strategy: NameStrategy | NameGenerator = "uuid") {
  function generateName(file: File): Promise<string> | string {
    if (typeof strategy === "function") return strategy(file);
    const uuid = randomUUID();
    if (strategy === "uuid-original") {
      return `${uuid}-${basename(file.name)}`;
    }
    const ext = extname(file.name);
    return `${uuid}${ext}`;
  }

  return (disk: Disk) => {
    disk.hook("put", async (_path, data, opts) => {
      if (!(data instanceof File)) return;
      const newName = await generateName(data);
      if (newName !== data.name) {
        opts.metadata = { ...opts.metadata, originalName: data.name };
      }
      return [newName, data, opts];
    });
  };
}
