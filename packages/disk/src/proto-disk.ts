import type {
  Disk,
  DiskDriver,
  DiskData,
  PutOptions,
  UrlOptions,
  ListOptions,
  FileSource,
  ProtoDiskOptions,
  FileMetadata,
} from "./types.js";
import { DiskFile } from "./file.js";
import { toReadableStream, getMimeType } from "./helpers.js";
import { DiskReadError, DiskFileNotFoundError, DiskMetadataError, DiskConfigError } from "./errors.js";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { extname, basename } from "node:path";

/**
 * Proto disk implementation that routes operations to different drivers
 * based on URL prefixes (protocol + optional base path).
 */
export class ProtoDisk implements Disk<DiskDriver> {
  readonly driver: DiskDriver;
  private readonly protocols: Record<string, DiskDriver>;
  private readonly defaultProtocol: string;
  private readonly basePath: string;
  private readonly sortedPrefixes: string[];

  constructor(options: ProtoDiskOptions) {
    const { protocols, defaultProtocol = "file://", basePath = process.cwd() } = options;

    this.protocols = protocols;
    this.defaultProtocol = defaultProtocol;
    this.basePath = basePath;

    // Sort prefixes by length (descending) for longest-match-first routing
    this.sortedPrefixes = Object.keys(protocols).sort((a, b) => b.length - a.length);

    // Get a reasonable default driver (for the driver property)
    const defaultDriver = protocols[defaultProtocol] || Object.values(protocols)[0];
    if (!defaultDriver) {
      throw new DiskConfigError("At least one driver must be provided in protocols");
    }
    this.driver = defaultDriver;
  }

  /**
   * Get driver for a given href based on longest matching prefix
   */
  public getDriver(href: string): DiskDriver {
    // Find the longest matching prefix
    for (const prefix of this.sortedPrefixes) {
      if (href.startsWith(prefix)) {
        const driver = this.protocols[prefix];
        if (driver) return driver;
      }
    }

    // No match found
    throw new Error(`No driver registered for href: ${href}\nAvailable prefixes: ${this.sortedPrefixes.join(", ")}`);
  }

  /**
   * Convert user-provided path to absolute href with protocol
   */
  private toHref(path: string): string {
    // If already has protocol, use as-is
    if (path.includes("://")) return path;

    // For relative paths, use default protocol
    if (this.defaultProtocol === "file://") {
      return pathToFileURL(path.startsWith("/") ? path : `${this.basePath}/${path}`).href;
    }

    // For other protocols, prepend protocol and basePath
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.defaultProtocol}${this.basePath ? `${this.basePath}/` : ""}${normalizedPath}`;
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

    const href = this.toHref(path);
    const driver = this.getDriver(href);

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

    // Call driver with stream
    const metadata = await driver.put(href, stream, options);

    // Create DiskFile from metadata
    const filename = basename(path);
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type,
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const fileDriver = this.getDriver(metadata.href);
        const result = await fileDriver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async get(path: string): Promise<DiskFile | null> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    const result = await driver.get(href);
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
        const fileDriver = this.getDriver(metadata.href);
        const result = await fileDriver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async delete(path: string): Promise<void> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    await driver.delete(href);
  }

  async exists(path: string): Promise<boolean> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    return driver.exists(href);
  }

  async url(path: string, urlOptions?: UrlOptions): Promise<string> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    return driver.url(href, urlOptions);
  }

  async copy(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? this.toHref(from) : from.href;
    const toHrefResolved = this.toHref(to);

    const sourceDriver = this.getDriver(fromHref);
    const destDriver = this.getDriver(toHrefResolved);

    // Same driver: use native copy (faster - e.g., S3-to-S3 server-side copy)
    if (sourceDriver === destDriver) {
      await sourceDriver.copy(fromHref, toHrefResolved);

      // Get metadata of the newly copied file
      const metadata = await destDriver.getMetadata(toHrefResolved);
      if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for copied file");

      const filename = basename(to);
      return new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type || getMimeType(metadata.href),
        lastModified: metadata.lastModified,
        metadata: metadata.metadata,
        stream: async () => {
          const fileDriver = this.getDriver(metadata.href);
          const result = await fileDriver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          return result[0];
        },
      });
    }

    // Different drivers: stream data between them
    const result = await sourceDriver.get(fromHref);
    if (!result) throw new DiskFileNotFoundError(fromHref);

    const [stream, sourceMetadata] = result;

    // Copy to destination with source metadata
    const metadata = await destDriver.put(toHrefResolved, stream, {
      type: sourceMetadata.type,
      lastModified: sourceMetadata.lastModified,
      metadata: sourceMetadata.metadata,
    });

    const filename = basename(to);
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const fileDriver = this.getDriver(metadata.href);
        const result = await fileDriver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async move(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? this.toHref(from) : from.href;
    const toHrefResolved = this.toHref(to);

    const sourceDriver = this.getDriver(fromHref);
    const destDriver = this.getDriver(toHrefResolved);

    // Same driver: use native move (faster)
    if (sourceDriver === destDriver) {
      await sourceDriver.move(fromHref, toHrefResolved);

      // Get metadata of the newly moved file
      const metadata = await destDriver.getMetadata(toHrefResolved);
      if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for moved file");

      const filename = basename(to);
      return new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type || getMimeType(metadata.href),
        lastModified: metadata.lastModified,
        metadata: metadata.metadata,
        stream: async () => {
          const fileDriver = this.getDriver(metadata.href);
          const result = await fileDriver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          return result[0];
        },
      });
    }

    // Different drivers: copy then delete
    const result = await sourceDriver.get(fromHref);
    if (!result) throw new DiskFileNotFoundError(fromHref);

    const [stream, sourceMetadata] = result;

    // Copy to destination
    const metadata = await destDriver.put(toHrefResolved, stream, {
      type: sourceMetadata.type,
      lastModified: sourceMetadata.lastModified,
      metadata: sourceMetadata.metadata,
    });

    // Delete source
    await sourceDriver.delete(fromHref);

    const filename = basename(to);
    return new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const fileDriver = this.getDriver(metadata.href);
        const result = await fileDriver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        return result[0];
      },
    });
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    const prefixHref = prefix ? this.toHref(prefix) : undefined;

    // If prefix has protocol, list only from that driver
    if (prefixHref) {
      const driver = this.getDriver(prefixHref);

      for await (const metadata of driver.list(prefixHref, listOptions)) {
        const filename = basename(metadata.href);
        yield new DiskFile(filename, {
          href: metadata.href,
          size: metadata.size,
          type: metadata.type || getMimeType(metadata.href),
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
          stream: async () => {
            const fileDriver = this.getDriver(metadata.href);
            const result = await fileDriver.get(metadata.href);
            if (!result) throw new DiskReadError(metadata.href);
            return result[0];
          },
        });
      }
      return;
    }

    // No prefix: list from all drivers
    for (const [_protocol, driver] of Object.entries(this.protocols)) {
      try {
        for await (const metadata of driver.list(undefined, listOptions)) {
          const filename = basename(metadata.href);
          yield new DiskFile(filename, {
            href: metadata.href,
            size: metadata.size,
            type: metadata.type || getMimeType(metadata.href),
            lastModified: metadata.lastModified,
            metadata: metadata.metadata,
            stream: async () => {
              const fileDriver = this.getDriver(metadata.href);
              const result = await fileDriver.get(metadata.href);
              if (!result) throw new DiskReadError(metadata.href);
              return result[0];
            },
          });
        }
      } catch (_error) {
        // Skip drivers that don't support listing without prefix
        // Silent failure - not all drivers may support global listing
      }
    }
  }

  // Make ProtoDisk iterable - allows `for await (const file of disk)`
  async *[Symbol.asyncIterator](): AsyncIterableIterator<DiskFile> {
    yield* this.list();
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    return driver.getMetadata(href);
  }
}
