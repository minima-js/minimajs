import type { Disk, DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileSource } from "./types.js";
import { DiskFile } from "./file.js";
import { toReadableStream, getMimeType } from "./helpers.js";
import { DiskReadError, DiskMetadataError } from "./errors.js";
import { randomUUID } from "node:crypto";
import { extname, basename } from "node:path";

export interface CreateDiskOptions<TDriver extends DiskDriver = DiskDriver> {
  driver?: TDriver;
}

/**
 * Disk implementation that wraps a driver
 * Paths are passed directly to the driver for interpretation
 */
export class StandardDisk<TDriver extends DiskDriver = DiskDriver> implements Disk<TDriver> {
  readonly driver: TDriver;

  constructor(driver: TDriver) {
    this.driver = driver;
  }

  // Overload: put with File auto-generates path
  async put(data: File, putOptions?: PutOptions): Promise<DiskFile>;
  async put(path: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile>;
  async put(pathOrData: string | File, dataOrOptions?: DiskData | PutOptions, putOptions?: PutOptions): Promise<DiskFile> {
    // Check if first argument is a File - auto-generate filename
    if (pathOrData instanceof File) {
      const ext = extname(pathOrData.name);
      const generatedPath = `${randomUUID()}${ext}`;
      const mergedOptions: PutOptions = (dataOrOptions as PutOptions) ?? {};
      mergedOptions.type ??= pathOrData.type;
      return this.put(generatedPath, pathOrData, mergedOptions);
    }

    // Standard usage: path + data
    const path = pathOrData as string;
    const data = dataOrOptions as DiskData;
    const options = { ...putOptions };

    // Convert data to ReadableStream
    const stream = toReadableStream(data);

    // Resolve content type from Blob or file extension
    if (!options.type) {
      if (data instanceof Blob) {
        options.type = data.type;
      } else {
        // Extract MIME type from file path extension
        options.type = getMimeType(path);
      }
    }

    // Call driver with path directly
    const metadata = await this.driver.put(path, stream, options);

    // Create DiskFile from metadata
    const filename = basename(path);
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

    const filename = basename(path);
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
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

    const filename = basename(to);
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
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

    const filename = basename(to);
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
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
      const filename = basename(metadata.href);
      yield new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type || getMimeType(metadata.href),
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

  // Make Disk iterable - allows `for await (const file of disk)`
  async *[Symbol.asyncIterator](): AsyncIterableIterator<DiskFile> {
    yield* this.list();
  }

  async getMetadata(path: string): Promise<import("./types.js").FileMetadata | null> {
    return this.driver.getMetadata(path);
  }
}
