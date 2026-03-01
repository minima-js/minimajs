/**
 * Hidden symbol key to store the originating Disk instance on a DiskFile.
 * Not enumerable, not serializable — invisible to File API consumers.
 *
 * @example
 * import { kDisk } from "@minimajs/disk";
 * const apple = await disk.get("apple.txt");
 * apple[kDisk]         // the Disk that produced this file
 * apple[kDisk]?.driver // the underlying driver
 */
export const kDisk: unique symbol = Symbol("minimajs.disk");
