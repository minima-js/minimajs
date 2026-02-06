import type { Disk, DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileSource } from "./types.js";

export * from "./file.js";
export * from "./types.js";
export * from "./helpers.js";
export * from "./adapters/fs.js";
export * from "./adapters/memory.js";

export interface CreateDiskOptions {
  driver: DiskDriver;
}

export function createDisk(options: CreateDiskOptions): Disk {
  const { driver } = options;

  return {
    driver,
    put: (key: string, data: DiskData, putOptions?: PutOptions) => driver.put(key, data, putOptions),
    get: (key: string) => driver.get(key),
    delete: (key: string) => driver.delete(key),
    exists: (key: string) => driver.exists(key),
    url: (key: string, urlOptions?: UrlOptions) => driver.url(key, urlOptions),
    copy: (from: FileSource, to: string) => driver.copy(from, to),
    move: (from: FileSource, to: string) => driver.move(from, to),
    list: (prefix?: string, listOptions?: ListOptions) => driver.list(prefix, listOptions),
    getMetadata: (key: string) => driver.getMetadata(key),
  };
}
