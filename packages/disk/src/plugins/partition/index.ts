import { createHash } from "node:crypto";
import type { Disk, DiskData, PutOptions } from "../../types.js";

export interface PartitionByDate {
  /** Partition by time — 'year' → yyyy, 'month' → yyyy/MM, 'date' → yyyy/MM/dd */
  by: "year" | "month" | "date";
}

export interface PartitionByHash {
  by: "hash";
  /** @default 2 */
  levels?: number;
  /** @default 2 */
  charsPerLevel?: number;
}

export type PartitionOptions = PartitionByDate | PartitionByHash;

/** Custom prefix generator — receives the same args as the `put` hook */
export type PartitionGenerator = (path: string, data: DiskData, opts: PutOptions) => string | Promise<string>;

function datePrefix(by: PartitionByDate["by"]): string {
  const d = new Date();
  const y = d.getFullYear().toString();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (by === "year") return y;
  if (by === "month") return `${y}/${m}`;
  return `${y}/${m}/${day}`;
}

function buildHashPrefix(path: string, levels: number, charsPerLevel: number): string {
  const hash = createHash("sha256").update(path).digest("hex");
  const parts: string[] = [];
  for (let i = 0; i < levels; i++) {
    parts.push(hash.slice(i * charsPerLevel, (i + 1) * charsPerLevel));
  }
  return parts.join("/");
}

/**
 * Partition plugin — automatically organizes files into subdirectories on write.
 *
 * The path passed to `put` is preserved as the filename; a prefix is prepended.
 * Files stored under the partitioned path must be accessed using the full path.
 *
 * @example
 * // Date-based: uploads become 2024/01/15/avatar.jpg
 * const disk = createDisk({ driver }, partition({ by: 'date' }))
 * await disk.put('avatar.jpg', data) // stored at 2024/01/15/avatar.jpg
 *
 * @example
 * // Hash-based: uploads become ab/cd/avatar.jpg (first 4 chars of sha256(path))
 * const disk = createDisk({ driver }, partition({ by: 'hash' }))
 * await disk.put('avatar.jpg', data) // stored at ab/cd/avatar.jpg
 *
 * @example
 * // Custom generator — full control over the prefix
 * const disk = createDisk({ driver }, partition((path) => `custom/${path.split('.').pop()}`))
 * await disk.put('avatar.jpg', data) // stored at custom/jpg/avatar.jpg
 */
export function partition(options: PartitionOptions | PartitionGenerator) {
  let getPrefix: PartitionGenerator;

  if (typeof options === "function") {
    getPrefix = options;
  } else if (options.by === "hash") {
    const { levels = 2, charsPerLevel = 2 } = options;
    getPrefix = (path) => buildHashPrefix(path, levels, charsPerLevel);
  } else {
    const { by } = options;
    getPrefix = () => datePrefix(by);
  }

  return (disk: Disk) => {
    disk.hook("put", async (path, data, opts) => {
      const prefix = await getPrefix(path, data, opts);
      const lastSlash = path.lastIndexOf("/");
      const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : "";
      const filename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
      return [`${dir}${prefix}/${filename}`, data, opts];
    });
  };
}
