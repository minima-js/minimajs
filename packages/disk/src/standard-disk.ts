import type { Disk, DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileSource, FileMetadata } from "./types.js";
import { DiskFile } from "./file.js";
import { toReadableStream, getMimeType } from "./helpers.js";
import { DiskReadError, DiskMetadataError } from "./errors.js";
import { randomUUID } from "node:crypto";
import { extname, basename } from "node:path";
import { inspect } from "node:util";
import {
  HookManager,
  type DiskHooks,
  type PutHookContext,
  type GetHookContext,
  type DeleteHookContext,
  type ExistsHookContext,
  type UrlHookContext,
  type CopyHookContext,
  type MoveHookContext,
  type ListHookContext,
} from "./hooks.js";

export interface StandardDiskOptions {
  hooks?: Partial<DiskHooks>;
}

/**
 * Disk implementation that wraps a driver
 * Paths are passed directly to the driver for interpretation
 */
export class StandardDisk<TDriver extends DiskDriver = DiskDriver> implements Disk<TDriver> {
  readonly driver: TDriver;
  private readonly $hookManager: HookManager;

  constructor(driver: TDriver, options: StandardDiskOptions) {
    this.driver = driver;
    this.$hookManager = new HookManager(options.hooks);
  }

  /**
   * Hook registration method (for use by plugins)
   */
  hook<K extends keyof DiskHooks>(event: K, handler: NonNullable<DiskHooks[K]>): void {
    this.$hookManager.add(event, handler);
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

    // Create hook context
    const hookContext: PutHookContext = { path, options };

    // Trigger put hook
    await this.$hookManager.trigger("put", hookContext);

    // Check if operation should be skipped
    let metadata: FileMetadata;
    if (hookContext.skipOperation && hookContext.result) {
      metadata = hookContext.result;
    } else {
      // Call driver with path directly
      metadata = await this.driver.put(path, stream, options);
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
        const result = await this.driver.get(metadata.href);
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
    // Create hook context
    const hookContext: GetHookContext = { path };

    // Trigger get hook
    await this.$hookManager.trigger("get", hookContext);

    // Check if operation should be skipped
    if (hookContext.skipOperation) {
      const result = hookContext.result ?? null;
      await this.$hookManager.trigger("retrieved", result, hookContext);
      return result;
    }

    const result = await this.driver.get(path);
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
          const result = await this.driver.get(metadata.href);
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
    // Create hook context
    const hookContext: DeleteHookContext = { path };

    // Trigger delete hook
    await this.$hookManager.trigger("delete", hookContext);

    // Check if operation should be skipped
    if (!hookContext.skipOperation) {
      await this.driver.delete(path);
    }

    // Trigger deleted hook
    await this.$hookManager.trigger("deleted", hookContext);
  }

  async exists(path: string): Promise<boolean> {
    // Create hook context
    const hookContext: ExistsHookContext = { path };

    // Trigger exists hook
    await this.$hookManager.trigger("exists", hookContext);

    // Check if operation should be skipped
    let exists: boolean;
    if (hookContext.skipOperation && hookContext.result !== undefined) {
      exists = hookContext.result;
    } else {
      exists = await this.driver.exists(path);
    }

    // Trigger checked hook
    await this.$hookManager.trigger("checked", exists, hookContext);

    return exists;
  }

  async url(path: string, urlOptions?: UrlOptions): Promise<string> {
    // Create hook context
    const hookContext: UrlHookContext = { path, options: urlOptions };

    // Check if operation should be skipped
    let url: string;
    if (hookContext.skipOperation && hookContext.result) {
      url = hookContext.result;
    } else {
      url = await this.driver.url(path, urlOptions);
    }

    // Trigger url hook
    await this.$hookManager.trigger("url", url, hookContext);

    return url;
  }

  async copy(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? from : from.href;

    // Create hook context
    const hookContext: CopyHookContext = { from: fromHref, to };

    // Trigger copy hook
    await this.$hookManager.trigger("copy", hookContext);

    // Check if operation should be skipped
    let diskFile: DiskFile;
    if (hookContext.skipOperation && hookContext.result) {
      diskFile = hookContext.result;
    } else {
      await this.driver.copy(fromHref, to);

      // Get metadata of the newly copied file
      const metadata = await this.driver.getMetadata(to);
      if (!metadata) throw new DiskMetadataError(to, "Failed to get metadata for copied file");

      const filename = basename(to);
      diskFile = new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type || getMimeType(metadata.href),
        lastModified: metadata.lastModified,
        metadata: metadata.metadata,
        stream: async () => {
          const result = await this.driver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          const stream = result[0];

          // Trigger streaming hook
          await this.$hookManager.trigger("streaming", stream, diskFile);

          return stream;
        },
      });
    }

    // Trigger copied hook
    await this.$hookManager.trigger("copied", diskFile, hookContext);

    return diskFile;
  }

  async move(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? from : from.href;

    // Create hook context
    const hookContext: MoveHookContext = { from: fromHref, to };

    // Trigger move hook
    await this.$hookManager.trigger("move", hookContext);

    // Check if operation should be skipped
    let diskFile: DiskFile;
    if (hookContext.skipOperation && hookContext.result) {
      diskFile = hookContext.result;
    } else {
      await this.driver.move(fromHref, to);

      // Get metadata of the newly moved file
      const metadata = await this.driver.getMetadata(to);
      if (!metadata) throw new DiskMetadataError(to, "Failed to get metadata for moved file");

      const filename = basename(to);
      diskFile = new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type || getMimeType(metadata.href),
        lastModified: metadata.lastModified,
        metadata: metadata.metadata,
        stream: async () => {
          const result = await this.driver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          const stream = result[0];

          // Trigger streaming hook
          await this.$hookManager.trigger("streaming", stream, diskFile);

          return stream;
        },
      });
    }

    // Trigger moved hook
    await this.$hookManager.trigger("moved", diskFile, hookContext);

    return diskFile;
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    // Create hook context
    const hookContext: ListHookContext = { prefix, options: listOptions };

    // Trigger list hook
    await this.$hookManager.trigger("list", hookContext);

    // Check if operation should be skipped
    if (hookContext.skipOperation) {
      return;
    }

    for await (const metadata of this.driver.list(prefix, listOptions)) {
      const filename = basename(metadata.href);
      const diskFile = new DiskFile(filename, {
        href: metadata.href,
        size: metadata.size,
        type: metadata.type || getMimeType(metadata.href),
        lastModified: metadata.lastModified,
        metadata: metadata.metadata,
        stream: async () => {
          const result = await this.driver.get(metadata.href);
          if (!result) throw new DiskReadError(metadata.href);
          const [stream] = result;
          await this.$hookManager.trigger("streaming", stream, diskFile);
          return stream;
        },
      });

      yield diskFile;
    }
  }

  // Make Disk iterable - allows `for await (const file of disk)`
  async *[Symbol.asyncIterator](): AsyncIterableIterator<DiskFile> {
    yield* this.list();
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    return this.driver.getMetadata(path);
  }

  [inspect.custom]() {
    const hooks = this.$hookManager.getRegisteredEvents();
    return {
      driver: this.driver,
      hooks: hooks.length > 0 ? hooks : undefined,
      [Symbol.toStringTag]: `StandardDisk`,
    };
  }

  get [Symbol.toStringTag]() {
    const tag = (this.driver as any)[Symbol.toStringTag];
    const name = `StandardDisk`;
    if (tag) {
      return `${name} (${tag})`;
    }
    return name;
  }
}
