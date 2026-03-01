import type { DiskDriver } from "../types.js";
import { type FsDriverBaseOptions, FsDriver } from "./fs.js";

// Filesystem adapter
export * from "./fs.js";

// Memory adapter
export * from "./memory.js";

export interface FSDriverOptions extends Omit<FsDriverBaseOptions, "root"> {
  root?: string;
}

export function createFsDriver(options: FSDriverOptions = {}): DiskDriver {
  return new FsDriver({ root: "file://" + process.cwd() + "/", ...options });
}
