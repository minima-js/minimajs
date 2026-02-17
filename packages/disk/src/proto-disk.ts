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
import { toReadableStream, resolveContentType } from "./helpers.js";
import { DiskReadError, DiskFileNotFoundError, DiskMetadataError, DiskConfigError } from "./errors.js";
import { pathToFileURL } from "node:url";

/**
 * Proto disk implementation that routes operations to different drivers
 * based on URL prefixes (protocol + optional base path).
 */
class ProtoDisk implements Disk {
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
  private getDriver(href: string): DiskDriver {
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

  async put(path: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);

    // Convert data to ReadableStream
    const stream = toReadableStream(data);

    // Resolve content type
    const contentType = resolveContentType(data, putOptions);

    // Call driver with stream
    const metadata = await driver.put(href, stream, {
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

      const filename = to.split("/").pop() || to;
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

    // Different drivers: stream data between them
    const result = await sourceDriver.get(fromHref);
    if (!result) throw new DiskFileNotFoundError(fromHref);

    const [stream, sourceMetadata] = result;

    // Copy to destination with source metadata
    await destDriver.put(toHrefResolved, stream, {
      type: sourceMetadata.type,
      lastModified: sourceMetadata.lastModified,
      metadata: sourceMetadata.metadata,
    });

    // Get metadata of the newly copied file
    const metadata = await destDriver.getMetadata(toHrefResolved);
    if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for copied file");

    const filename = to.split("/").pop() || to;
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

      const filename = to.split("/").pop() || to;
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

    // Different drivers: copy then delete
    const result = await sourceDriver.get(fromHref);
    if (!result) throw new DiskFileNotFoundError(fromHref);

    const [stream, sourceMetadata] = result;

    // Copy to destination
    await destDriver.put(toHrefResolved, stream, {
      type: sourceMetadata.type,
      lastModified: sourceMetadata.lastModified,
      metadata: sourceMetadata.metadata,
    });

    // Delete source
    await sourceDriver.delete(fromHref);

    // Get metadata of the newly moved file
    const metadata = await destDriver.getMetadata(toHrefResolved);
    if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for moved file");

    const filename = to.split("/").pop() || to;
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

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    const prefixHref = prefix ? this.toHref(prefix) : undefined;

    // If prefix has protocol, list only from that driver
    if (prefixHref) {
      const driver = this.getDriver(prefixHref);

      for await (const metadata of driver.list(prefixHref, listOptions)) {
        const filename = metadata.href.split("/").pop() || "unknown";
        yield new DiskFile(filename, {
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
      return;
    }

    // No prefix: list from all drivers
    for (const [_protocol, driver] of Object.entries(this.protocols)) {
      try {
        for await (const metadata of driver.list(undefined, listOptions)) {
          const filename = metadata.href.split("/").pop() || "unknown";
          yield new DiskFile(filename, {
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

/**
 * Create a proto disk instance that routes operations to different drivers
 * based on URL prefixes (protocol + optional base path).
 *
 * Supports granular routing by matching longest prefix first:
 * - Protocol-only: 'file://', 's3://', 'https://'
 * - Bucket-specific: 's3://images-bucket/', 's3://videos-bucket/'
 * - Domain-specific: 'https://cdn1.example.com/', 'https://cdn2.example.com/'
 *
 * @example
 * ```typescript
 * const disk = createProtoDisk({
 *   protocols: {
 *     'file://': fsDriver,
 *     's3://images-bucket/': s3ImagesDriver,
 *     's3://videos-bucket/': s3VideosDriver,
 *     'https://cdn.example.com/': azureDriver
 *   },
 *   defaultProtocol: 'file://',
 *   basePath: '/uploads'
 * });
 *
 * // Routes to s3ImagesDriver
 * await disk.put('s3://images-bucket/avatar.jpg', file);
 *
 * // Routes to s3VideosDriver
 * await disk.put('s3://videos-bucket/intro.mp4', file);
 *
 * // Cross-storage copy between different buckets
 * await disk.copy('s3://images-bucket/file.jpg', 's3://videos-bucket/file.jpg');
 * ```
 */
export function createProtoDisk(options: ProtoDiskOptions): Disk {
  return new ProtoDisk(options);
}
