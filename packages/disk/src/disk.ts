import type { Disk, DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileSource } from "./types.js";
import { DiskFile } from "./file.js";
import { toReadableStream, resolveContentType } from "./helpers.js";
import { DiskReadError, DiskMetadataError } from "./errors.js";

export interface CreateDiskOptions {
  driver: DiskDriver;
}

/**
 * Disk implementation that wraps a driver
 * Paths are passed directly to the driver for interpretation
 */
class DiskImpl implements Disk {
  readonly driver: DiskDriver;

  constructor(options: CreateDiskOptions) {
    this.driver = options.driver;
  }

  async put(path: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile> {
    // Convert data to ReadableStream
    const stream = toReadableStream(data);

    // Resolve content type from FilePropertyBag.type
    const contentType = resolveContentType(data, putOptions);

    // Call driver with path directly
    const metadata = await this.driver.put(path, stream, {
      ...putOptions,
      type: contentType,
    });

    // Create DiskFile from metadata
    const filename = path.split("/").pop() || path;
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type,
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const result = await this.driver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async get(path: string): Promise<DiskFile | null> {
    const result = await this.driver.get(path);
    if (!result) return null;

    const [stream, metadata] = result;

    // Track if the first stream has been consumed
    let firstStreamUsed = false;

    const filename = path.split("/").pop() || path;
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type,
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        // First call: use the already-fetched stream
        if (!firstStreamUsed) {
          firstStreamUsed = true;
          return stream;
        }
        // Subsequent calls: re-fetch from storage
        const result = await this.driver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async delete(path: string): Promise<void> {
    await this.driver.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.driver.exists(path);
  }

  async url(path: string, urlOptions?: UrlOptions): Promise<string> {
    return this.driver.url(path, urlOptions);
  }

  async copy(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? from : from.href;

    await this.driver.copy(fromHref, to);

    // Get metadata of the newly copied file
    const metadata = await this.driver.getMetadata(to);
    if (!metadata) throw new DiskMetadataError(to, "Failed to get metadata for copied file");

    const filename = to.split("/").pop() || to;
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type,
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const result = await this.driver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async move(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? from : from.href;

    await this.driver.move(fromHref, to);

    // Get metadata of the newly moved file
    const metadata = await this.driver.getMetadata(to);
    if (!metadata) throw new DiskMetadataError(to, "Failed to get metadata for moved file");

    const filename = to.split("/").pop() || to;
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type,
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const result = await this.driver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    for await (const metadata of this.driver.list(prefix, listOptions)) {
      const filename = metadata.href.split("/").pop() || "unknown";
      yield new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type,
        lastModified: metadata.lastModified,
        metadata: metadata.metadata,
        stream: async () => {
          const result = await this.driver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          return result[0];
        },
      });
    }
  }

  async getMetadata(path: string): Promise<import("./types.js").FileMetadata | null> {
    return this.driver.getMetadata(path);
  }
}

/**
 * Create a Disk instance that wraps a driver
 * Paths are passed directly to the driver for interpretation
 *
 * @example
 * ```typescript
 * import { createDisk, createFsDriver } from '@minimajs/disk';
 *
 * const disk = createDisk({
 *   driver: createFsDriver({ root: '/tmp/uploads' })
 * });
 *
 * await disk.put('avatar.jpg', imageData);
 * ```
 */
export function createDisk(options: CreateDiskOptions): Disk {
  return new DiskImpl(options);
}
