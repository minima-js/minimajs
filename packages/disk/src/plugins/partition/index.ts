import { createHash } from "node:crypto";
import type { Disk } from "../../types.js";

export type PartitionStrategy = "date" | "hash";

export interface PartitionOptions {
  /** Partition strategy — 'date' organizes by time, 'hash' by content hash */
  by: PartitionStrategy;
  /**
   * Date format string — only used when `by: 'date'`
   * Supports: YYYY, MM, DD, HH
   * @default 'YYYY/MM/DD'
   */
  dateFormat?: string;
  /**
   * Number of prefix levels — only used when `by: 'hash'`
   * @default 2
   */
  levels?: number;
  /**
   * Characters per level — only used when `by: 'hash'`
   * @default 2
   */
  charsPerLevel?: number;
}

function applyDateFormat(format: string, date: Date): string {
  return format
    .replace("YYYY", date.getFullYear().toString())
    .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
    .replace("DD", String(date.getDate()).padStart(2, "0"))
    .replace("HH", String(date.getHours()).padStart(2, "0"));
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
 * // Custom date format — hourly buckets
 * const disk = createDisk({ driver }, partition({ by: 'date', dateFormat: 'YYYY/MM/DD/HH' }))
 */
export function partition(options: PartitionOptions) {
  const { by, dateFormat = "YYYY/MM/DD", levels = 2, charsPerLevel = 2 } = options;

  return (disk: Disk) => {
    disk.hook("put", (path, data, opts) => {
      const prefix =
        by === "date"
          ? applyDateFormat(dateFormat, new Date())
          : buildHashPrefix(path, levels, charsPerLevel);
      return [`${prefix}/${path}`, data, opts];
    });
  };
}
