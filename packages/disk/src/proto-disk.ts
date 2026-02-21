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
import { inspect } from "node:util";
import { HookManager } from "./hooks/manager.js";
import { type DiskHooks, type UrlHookContext, type MoveHookContext, type ListHookContext } from "./hooks/types.js";
import { type CopyHookContext } from "./hooks/types.js";
import { type ExistsHookContext } from "./hooks/types.js";
import { type DeleteHookContext } from "./hooks/types.js";
import { type GetHookContext } from "./hooks/types.js";
import { type PutHookContext } from "./hooks/types.js";

/**
 * Proto disk implementation that routes operations to different drivers
 * based on URL prefixes (protocol + optional base path).
 */
export class ProtoDisk implements Disk<DiskDriver> {
  readonly driver: DiskDriver;
  private readonly $hookManager: HookManager;
  private readonly protocols: Record<string, DiskDriver>;
  private readonly defaultProtocol: string;
  private readonly basePath: string;
  private readonly sortedPrefixes: string[];

  constructor(options: ProtoDiskOptions) {
    const { protocols, defaultProtocol = "file://", basePath = process.cwd(), hooks } = options;

    this.protocols = protocols;
    this.defaultProtocol = defaultProtocol;
    this.basePath = basePath;
    this.$hookManager = new HookManager(hooks);

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
   * Hook registration method (for use by plugins)
   */
  hook<K extends keyof DiskHooks>(event: K, handler: NonNullable<DiskHooks[K]>): void {
    this.$hookManager.add(event, handler);
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

    // Create hook context
    const hookContext: PutHookContext = { path: href, options };

    // Trigger put hook
    await this.$hookManager.trigger("put", hookContext);

    // Check if operation should be skipped
    let metadata: FileMetadata;
    if (hookContext.skipOperation && hookContext.result) {
      metadata = hookContext.result;
    } else {
      // Call driver with stream
      metadata = await driver.put(href, stream, options);
    }

    // Create DiskFile from metadata
    const filename = basename(path);
    const diskFile = new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type,
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        const fileDriver = this.getDriver(metadata.href);
        const result = await fileDriver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        const stream = result[0];
        // Trigger streaming hook
        await this.$hookManager.trigger("streaming", stream, diskFile);
        return stream;
      },
    });

    // Trigger stored hook
    await this.$hookManager.trigger("stored", diskFile, hookContext);

    return diskFile;
  }

  async get(path: string): Promise<DiskFile | null> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);

    // Create hook context
    const hookContext: GetHookContext = { path: href };

    // Trigger get hook
    await this.$hookManager.trigger("get", hookContext);

    // Check if operation should be skipped
    if (hookContext.skipOperation) {
      const result = hookContext.result ?? null;
      await this.$hookManager.trigger("retrieved", result, hookContext);
      return result;
    }

    const result = await driver.get(href);
    if (!result) {
      await this.$hookManager.trigger("retrieved", null, hookContext);
      return null;
    }

    const [stream, metadata] = result;

    // Track if the first stream has been consumed
    let firstStreamUsed = false;

    const filename = basename(path);
    const diskFile = new DiskFile(filename, {
      href: metadata.href,
      size: metadata.size,
      type: metadata.type || getMimeType(metadata.href),
      lastModified: metadata.lastModified,
      metadata: metadata.metadata,
      stream: async () => {
        let resultStream: ReadableStream;

        // First call: use the already-fetched stream
        if (!firstStreamUsed) {
          firstStreamUsed = true;
          resultStream = stream;
        } else {
          // Subsequent calls: re-fetch from storage
          const fileDriver = this.getDriver(metadata.href);
          const result = await fileDriver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          resultStream = result[0];
        }

        // Trigger streaming hook
        await this.$hookManager.trigger("streaming", resultStream, diskFile);
        return resultStream;
      },
    });

    // Trigger retrieved hook
    await this.$hookManager.trigger("retrieved", diskFile, hookContext);

    return diskFile;
  }

  async delete(path: string): Promise<void> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);

    // Create hook context
    const hookContext: DeleteHookContext = { path: href };

    // Trigger delete hook
    await this.$hookManager.trigger("delete", hookContext);

    // Check if operation should be skipped
    if (!hookContext.skipOperation) {
      await driver.delete(href);
    }

    // Trigger deleted hook
    await this.$hookManager.trigger("deleted", hookContext);
  }

  async exists(path: string): Promise<boolean> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);

    // Create hook context
    const hookContext: ExistsHookContext = { path: href };

    // Trigger exists hook
    await this.$hookManager.trigger("exists", hookContext);

    // Check if operation should be skipped
    let exists: boolean;
    if (hookContext.skipOperation && hookContext.result !== undefined) {
      exists = hookContext.result;
    } else {
      exists = await driver.exists(href);
    }

    // Trigger checked hook
    await this.$hookManager.trigger("checked", exists, hookContext);

    return exists;
  }

  async url(path: string, urlOptions?: UrlOptions): Promise<string> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);

    // Create hook context
    const hookContext: UrlHookContext = { path: href, options: urlOptions };

    // Check if operation should be skipped
    let url: string;
    if (hookContext.skipOperation && hookContext.result) {
      url = hookContext.result;
    } else {
      url = await driver.url(href, urlOptions);
    }

    // Trigger url hook
    await this.$hookManager.trigger("url", url, hookContext);

    return url;
  }

  async copy(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? this.toHref(from) : from.href;
    const toHrefResolved = this.toHref(to);

    const sourceDriver = this.getDriver(fromHref);
    const destDriver = this.getDriver(toHrefResolved);

    // Create hook context
    const hookContext: CopyHookContext = { from: fromHref, to: toHrefResolved };

    // Trigger copy hook
    await this.$hookManager.trigger("copy", hookContext);

    // Check if operation should be skipped
    let diskFile: DiskFile;
    if (hookContext.skipOperation && hookContext.result) {
      diskFile = hookContext.result;
    } else {
      // Same driver: use native copy (faster - e.g., S3-to-S3 server-side copy)
      if (sourceDriver === destDriver) {
        await sourceDriver.copy(fromHref, toHrefResolved);

        // Get metadata of the newly copied file
        const metadata = await destDriver.getMetadata(toHrefResolved);
        if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for copied file");

        const filename = basename(to);
        diskFile = new DiskFile(filename, {
          href: metadata.href,
          size: metadata.size,
          type: metadata.type || getMimeType(metadata.href),
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
          stream: async () => {
            const fileDriver = this.getDriver(metadata.href);
            const result = await fileDriver.get(metadata.href);
            if (!result) throw new DiskReadError(metadata.href);
            const stream = result[0];
            // Trigger streaming hook
            await this.$hookManager.trigger("streaming", stream, diskFile);
            return stream;
          },
        });
      } else {
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
        diskFile = new DiskFile(filename, {
          href: metadata.href,
          size: metadata.size,
          type: metadata.type || getMimeType(metadata.href),
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
          stream: async () => {
            const fileDriver = this.getDriver(metadata.href);
            const result = await fileDriver.get(metadata.href);
            if (!result) throw new DiskReadError(metadata.href);
            const stream = result[0];
            // Trigger streaming hook
            await this.$hookManager.trigger("streaming", stream, diskFile);
            return stream;
          },
        });
      }
    }

    // Trigger copied hook
    await this.$hookManager.trigger("copied", diskFile, hookContext);

    return diskFile;
  }

  async move(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? this.toHref(from) : from.href;
    const toHrefResolved = this.toHref(to);

    const sourceDriver = this.getDriver(fromHref);
    const destDriver = this.getDriver(toHrefResolved);

    // Create hook context
    const hookContext: MoveHookContext = { from: fromHref, to: toHrefResolved };

    // Trigger move hook
    await this.$hookManager.trigger("move", hookContext);

    // Check if operation should be skipped
    let diskFile: DiskFile;
    if (hookContext.skipOperation && hookContext.result) {
      diskFile = hookContext.result;
    } else {
      // Same driver: use native move (faster)
      if (sourceDriver === destDriver) {
        await sourceDriver.move(fromHref, toHrefResolved);

        // Get metadata of the newly moved file
        const metadata = await destDriver.getMetadata(toHrefResolved);
        if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for moved file");

        const filename = basename(to);
        diskFile = new DiskFile(filename, {
          href: metadata.href,
          size: metadata.size,
          type: metadata.type || getMimeType(metadata.href),
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
          stream: async () => {
            const fileDriver = this.getDriver(metadata.href);
            const result = await fileDriver.get(metadata.href);
            if (!result) throw new DiskReadError(metadata.href);
            const stream = result[0];
            // Trigger streaming hook
            await this.$hookManager.trigger("streaming", stream, diskFile);
            return stream;
          },
        });
      } else {
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
        diskFile = new DiskFile(filename, {
          href: metadata.href,
          size: metadata.size,
          type: metadata.type || getMimeType(metadata.href),
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
          stream: async () => {
            const fileDriver = this.getDriver(metadata.href);
            const result = await fileDriver.get(metadata.href);
            if (!result) throw new DiskReadError(metadata.href);
            const stream = result[0];
            // Trigger streaming hook
            await this.$hookManager.trigger("streaming", stream, diskFile);
            return stream;
          },
        });
      }
    }

    // Trigger moved hook
    await this.$hookManager.trigger("moved", diskFile, hookContext);

    return diskFile;
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    const prefixHref = prefix ? this.toHref(prefix) : undefined;

    // Create hook context
    const hookContext: ListHookContext = { prefix: prefixHref, options: listOptions };

    // Trigger list hook
    await this.$hookManager.trigger("list", hookContext);

    // Check if operation should be skipped
    if (hookContext.skipOperation) {
      return;
    }

    // If prefix has protocol, list only from that driver
    if (prefixHref) {
      const driver = this.getDriver(prefixHref);

      for await (const metadata of driver.list(prefixHref, listOptions)) {
        const filename = basename(metadata.href);
        const diskFile = new DiskFile(filename, {
          href: metadata.href,
          size: metadata.size,
          type: metadata.type || getMimeType(metadata.href),
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
          stream: async () => {
            const fileDriver = this.getDriver(metadata.href);
            const result = await fileDriver.get(metadata.href);
            if (!result) throw new DiskReadError(metadata.href);
            const stream = result[0];
            // Trigger streaming hook
            await this.$hookManager.trigger("streaming", stream, diskFile);
            return stream;
          },
        });
        yield diskFile;
      }
      return;
    }

    // No prefix: list from all drivers
    for (const [_protocol, driver] of Object.entries(this.protocols)) {
      try {
        for await (const metadata of driver.list(undefined, listOptions)) {
          const filename = basename(metadata.href);
          const diskFile = new DiskFile(filename, {
            href: metadata.href,
            size: metadata.size,
            type: metadata.type || getMimeType(metadata.href),
            lastModified: metadata.lastModified,
            metadata: metadata.metadata,
            stream: async () => {
              const fileDriver = this.getDriver(metadata.href);
              const result = await fileDriver.get(metadata.href);
              if (!result) throw new DiskReadError(metadata.href);
              const stream = result[0];
              // Trigger streaming hook
              await this.$hookManager.trigger("streaming", stream, diskFile);
              return stream;
            },
          });
          yield diskFile;
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

  [inspect.custom]() {
    const hooks = this.$hookManager.getRegisteredEvents();
    return {
      protocols: Object.keys(this.protocols),
      defaultProtocol: this.defaultProtocol,
      hooks: hooks.length > 0 ? hooks : undefined,
      [Symbol.toStringTag]: `ProtoDisk`,
    };
  }

  get [Symbol.toStringTag]() {
    return `ProtoDisk`;
  }
}
