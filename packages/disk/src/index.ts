import type { Disk, DiskDriver, DiskData, PutOptions, UrlOptions } from "./types.js";

export * from "./file.js";
export * from "./types.js";
export * from "./helpers.js";
export * from "./adapters/fs.js";

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
  };
}
