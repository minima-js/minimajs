import type {
  Disk,
  DiskDriver,
  DiskData,
  PutOptions,
  UrlOptions,
  ListOptions,
  FileSource,
  FileMetadata,
  LockOptions,
  WatchOptions,
  SnapshotOptions,
  RestoreOptions,
} from "./types.js";
import { DiskFile } from "./file.js";
import { toReadableStream, getMimeType, createDiskFile } from "./helpers.js";
import { DiskReadError, DiskMetadataError } from "./errors.js";
import { randomUUID } from "node:crypto";
import { extname, basename } from "node:path";
import { inspect } from "node:util";
import { LockManager } from "./locking.js";
import type { FSWatcher } from "chokidar";
import { createGzip, createGunzip } from "node:zlib";
import { HookManager } from "./hooks/manager.js";
import { type DiskHooks } from "./hooks/types.js";

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
  private readonly $lockManager: LockManager;

  constructor(driver: TDriver, options: StandardDiskOptions) {
    this.driver = driver;
    this.$hookManager = new HookManager(options.hooks);
    this.$lockManager = new LockManager();
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

    const [path, data, options] = await this.$hookManager.trigger.put(
      pathOrData,
      dataOrOptions as DiskData,
      putOptions ?? {}
    );

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

    // Trigger put hook

    // Check if operation should be skipped
    const metadata = await this.driver.put(path, stream, options);

    // Create DiskFile from metadata
    const filename = basename(path);

    const diskFile = createDiskFile(filename, metadata, async (file) => {
      const result = await this.driver.get(metadata.href);
      if (!result) throw new DiskReadError(metadata.href);
      return this.$hookManager.trigger.streaming(result[0], file);
    });
    // Trigger stored hook
    return this.$hookManager.trigger.stored(diskFile);
  }

  async get(origPath: string): Promise<DiskFile | null> {
    // Create hook context

    // Trigger get hook
    const path = await this.$hookManager.trigger.get(origPath);

    const result = await this.driver.get(path);
    if (!result) {
      return null;
    }

    const [stream, metadata] = result;
    let cachedStream: ReadableStream<Uint8Array> | null = stream;

    const filename = basename(path);
    const diskFile = createDiskFile(filename, metadata, async (file) => {
      if (cachedStream) {
        const s = cachedStream;
        cachedStream = null;
        return this.$hookManager.trigger.streaming(s, file);
      }
      const fetched = await this.driver.get(metadata.href);
      if (!fetched) throw new DiskReadError(metadata.href);
      return this.$hookManager.trigger.streaming(fetched[0], file);
    });

    // Trigger retrieved hook
    return this.$hookManager.trigger.retrieved(diskFile);
  }
  async delete(path: string): Promise<void> {
    await this.$hookManager.trigger.delete(path);
    await this.driver.delete(path);
    await this.$hookManager.trigger.deleted(path);
  }

  async exists(path: string): Promise<boolean> {
    await this.$hookManager.trigger.exists(path);
    const exists = await this.driver.exists(path);
    await this.$hookManager.trigger.checked(path, exists);
    return exists;
  }

  async url(path: string, urlOptions?: UrlOptions): Promise<string> {
    const url = await this.driver.url(path, urlOptions);
    return this.$hookManager.trigger.url(path, url, urlOptions);
  }

  async copy(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? from : from.href;
    const [$from, $to] = await this.$hookManager.trigger.copy(fromHref, to);

    await this.driver.copy($from, $to);
    const metadata = await this.driver.getMetadata($to);
    if (!metadata) throw new DiskMetadataError($to, "Failed to get metadata for copied file");

    const diskFile = createDiskFile(basename($to), metadata, async (file) => {
      const result = await this.driver.get(metadata.href);
      if (!result) throw new DiskReadError(metadata.href);
      return this.$hookManager.trigger.streaming(result[0], file);
    });

    return this.$hookManager.trigger.copied($from, $to, diskFile);
  }

  async move(from: FileSource, to: string): Promise<DiskFile> {
    const fromHref = typeof from === "string" ? from : from.href;
    const [$from, $to] = await this.$hookManager.trigger.move(fromHref, to);

    await this.driver.move($from, $to);
    const metadata = await this.driver.getMetadata($to);
    if (!metadata) throw new DiskMetadataError($to, "Failed to get metadata for moved file");

    const diskFile = createDiskFile(basename($to), metadata, async (file) => {
      const result = await this.driver.get(metadata.href);
      if (!result) throw new DiskReadError(metadata.href);
      return this.$hookManager.trigger.streaming(result[0], file);
    });

    return this.$hookManager.trigger.moved($from, $to, diskFile);
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    // Trigger list hook
    const [$prefix, $listOptions] = await this.$hookManager.trigger.list(prefix, listOptions);

    for await (const metadata of this.driver.list($prefix, $listOptions)) {
      const filename = basename(metadata.href);
      yield createDiskFile(filename, metadata, async (file) => {
        const result = await this.driver.get(metadata.href);
        if (!result) throw new DiskReadError(metadata.href);
        const [stream] = result;
        return this.$hookManager.trigger.streaming(stream, file);
      });
    }
  }

  // Make Disk iterable - allows `for await (const file of disk)`
  async *[Symbol.asyncIterator](): AsyncIterableIterator<DiskFile> {
    yield* this.list();
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    return this.driver.getMetadata(path);
  }

  /**
   * Acquire a lock for a file key
   */
  async lock(key: string, options?: LockOptions) {
    return this.$lockManager.lock(key, options);
  }

  /**
   * Execute a function with a lock
   */
  async withLock<T>(key: string, fn: () => Promise<T>, options?: LockOptions): Promise<T> {
    return this.$lockManager.withLock(key, fn, options);
  }

  /**
   * Watch files matching a pattern for changes
   */
  watch(pattern: string, options?: WatchOptions): FSWatcher | Promise<FSWatcher> {
    if (!this.driver.watch) {
      throw new Error(`Driver "${this.driver.name}" does not support file watching`);
    }
    return this.driver.watch(pattern, options);
  }

  /**
   * Create a snapshot of a file or directory
   */
  async snapshot(path: string, destination?: Disk, targetOptions?: SnapshotOptions): Promise<string> {
    const options = {
      prefix: "snapshots/",
      includeMetadata: true,
      ...targetOptions,
    };

    const targetDisk = destination ?? this;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotPath = `${options.prefix}${path.replace(/\//g, "_")}_${timestamp}.snapshot`;

    // Check if path is a single file or directory (by checking if it's a pattern)
    const isDirectory = path.endsWith("/") || path.includes("*");

    if (isDirectory) {
      // Snapshot multiple files
      const files: Array<{ path: string; metadata?: FileMetadata }> = [];

      // Collect all files
      for await (const file of this.list(path.replace(/\/$/, ""))) {
        const metadata = options.includeMetadata ? await this.getMetadata(file.href) : undefined;
        files.push({ path: file.href, metadata: metadata ?? undefined });
      }

      // Create manifest
      const manifest = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        sourcePath: path,
        files,
      };

      // Store manifest and files
      const manifestPath = `${snapshotPath}/manifest.json`;
      await targetDisk.put(manifestPath, JSON.stringify(manifest, null, 2), {
        type: "application/json",
      });

      // Copy each file
      for (const fileInfo of files) {
        const file = await this.get(fileInfo.path);
        if (!file) continue;

        const fileSnapshotPath = `${snapshotPath}/files/${fileInfo.path}`;
        const stream = file.stream();
        await targetDisk.put(fileSnapshotPath, stream, {
          type: file.type,
        });
      }

      return snapshotPath;
    } else {
      // Snapshot single file
      const file = await this.get(path);
      if (!file) {
        throw new Error(`File not found: ${path}`);
      }

      const metadata = options.includeMetadata ? await this.getMetadata(path) : undefined;

      // Create manifest for single file
      const manifest = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        sourcePath: path,
        metadata,
      };

      const manifestPath = `${snapshotPath}/manifest.json`;
      await targetDisk.put(manifestPath, JSON.stringify(manifest, null, 2), {
        type: "application/json",
      });

      // Copy file
      const stream = await file.stream();
      const fileSnapshotPath = `${snapshotPath}/file`;

      if (options.compression === "gzip") {
        const { Readable } = await import("node:stream");
        const nodeStream = Readable.fromWeb(stream as any);
        const gzipStream = nodeStream.pipe(createGzip());
        const webStream = Readable.toWeb(gzipStream) as ReadableStream<Uint8Array>;

        await targetDisk.put(`${fileSnapshotPath}.gz`, webStream, {
          type: file.type,
        });
      } else {
        await targetDisk.put(fileSnapshotPath, stream, {
          type: file.type,
        });
      }

      return snapshotPath;
    }
  }

  /**
   * Restore from a snapshot
   */
  async restore(snapshotPath: string, destination?: Disk, restoreOptions?: RestoreOptions): Promise<void> {
    const options = {
      overwrite: false,
      ...restoreOptions,
    };

    const sourceDisk = destination ?? this;

    // Read manifest
    const manifestPath = `${snapshotPath}/manifest.json`;
    const manifestFile = await sourceDisk.get(manifestPath);
    if (!manifestFile) {
      throw new Error(`Snapshot manifest not found: ${manifestPath}`);
    }

    const manifestStream = await manifestFile.stream();
    const manifestText = await new Response(manifestStream).text();
    const manifest = JSON.parse(manifestText);

    const targetPath = options.targetPath ?? manifest.sourcePath;

    if (manifest.files) {
      // Restore directory
      for (const fileInfo of manifest.files) {
        const fileSnapshotPath = `${snapshotPath}/files/${fileInfo.path}`;
        const actualPath =
          manifest.version === "1.0" && fileSnapshotPath.endsWith(".gz") ? fileSnapshotPath : `${fileSnapshotPath}.gz`;

        let file = await sourceDisk.get(actualPath);
        if (!file) {
          // Try without .gz extension
          file = await sourceDisk.get(fileSnapshotPath);
        }

        if (!file) continue;

        const restorePath = options.targetPath ? `${options.targetPath}/${fileInfo.path}` : fileInfo.path;

        // Check if file exists
        if (!options.overwrite && (await this.exists(restorePath))) {
          continue;
        }

        const stream = await file.stream();

        if (actualPath.endsWith(".gz")) {
          // Decompress
          const { Readable } = await import("node:stream");
          const nodeStream = Readable.fromWeb(stream as any);
          const gunzipStream = nodeStream.pipe(createGunzip());
          const webStream = Readable.toWeb(gunzipStream) as ReadableStream<Uint8Array>;

          await this.put(restorePath, webStream, {
            type: file.type,
          });
        } else {
          await this.put(restorePath, stream, {
            type: file.type,
          });
        }
      }
    } else {
      // Restore single file
      const fileSnapshotPath = `${snapshotPath}/file`;
      const actualPath = fileSnapshotPath.endsWith(".gz") ? fileSnapshotPath : `${fileSnapshotPath}.gz`;

      let file = await sourceDisk.get(actualPath);
      if (!file) {
        file = await sourceDisk.get(fileSnapshotPath);
      }

      if (!file) {
        throw new Error(`Snapshot file not found: ${fileSnapshotPath}`);
      }

      // Check if file exists
      if (!options.overwrite && (await this.exists(targetPath))) {
        throw new Error(`File already exists: ${targetPath}. Use overwrite: true to replace.`);
      }

      const stream = await file.stream();

      if (actualPath.endsWith(".gz")) {
        const { Readable } = await import("node:stream");
        const nodeStream = Readable.fromWeb(stream as any);
        const gunzipStream = nodeStream.pipe(createGunzip());
        const webStream = Readable.toWeb(gunzipStream) as ReadableStream<Uint8Array>;

        await this.put(targetPath, webStream, {
          type: file.type,
        });
      } else {
        await this.put(targetPath, stream, {
          type: file.type,
        });
      }
    }
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
