import type {
  Disk,
  DiskDriver,
  DiskData,
  PutOptions,
  UrlOptions,
  ListOptions,
  FileSource,
  FileMetadata,
  WatchOptions,
} from "./types.js";
import { DiskFile } from "./file.js";
import { fileFromMetadata, getDisk, ensureMetadataSymbols } from "./helpers.js";
import { DiskReadError, DiskMetadataError } from "./errors.js";
import { randomUUID } from "node:crypto";
import { extname, basename } from "node:path";
import { inspect } from "node:util";
import type { FSWatcher } from "chokidar";
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

  constructor(driver: TDriver, options: StandardDiskOptions) {
    this.driver = driver;
    this.$hookManager = new HookManager(this, options.hooks);
  }

  /**
   * Hook registration method (for use by plugins)
   */
  hook<K extends keyof DiskHooks>(event: K, handler: NonNullable<DiskHooks[K]>): () => void {
    this.$hookManager.add(event, handler);
    return () => this.$hookManager.remove(event, handler);
  }

  // Overload: put with File auto-generates path
  async put(data: File, options?: PutOptions): Promise<DiskFile>;
  async put(path: string, data: DiskData, options?: PutOptions): Promise<DiskFile>;
  async put(
    pathOrData: string | File,
    dataOrOptions?: DiskData | PutOptions,
    putOptions: PutOptions = {}
  ): Promise<DiskFile> {
    if (pathOrData instanceof File) {
      const ext = extname(pathOrData.name);
      const generatedPath = `${randomUUID()}${ext}`;
      const mergedOptions: PutOptions = (dataOrOptions as PutOptions) ?? {};
      mergedOptions.type ??= pathOrData.type;
      return this.put(generatedPath, pathOrData, mergedOptions);
    }

    const data = dataOrOptions as DiskData;
    const resolvedOptions: PutOptions = { ...putOptions };
    if (resolvedOptions.size === undefined && data instanceof Blob) {
      resolvedOptions.size = data.size;
    }

    const [path, stream, options] = await this.$hookManager.trigger.put(pathOrData, data, resolvedOptions);

    const metadata = await this.driver
      .put(path, await this.$hookManager.trigger.storing(path, stream, options), options)
      .catch(async (err) => {
        await this.driver.delete(path).catch(() => {});
        throw err;
      });

    // Merge symbol-keyed entries from options.metadata into the returned metadata.
    // Symbol keys are plugin-private state; drivers are not responsible for preserving them.
    if (options.metadata) {
      ensureMetadataSymbols(options.metadata, metadata.metadata);
    }

    const diskFile = await fileFromMetadata(this.driver, this.$hookManager.trigger, metadata);
    return this.$hookManager.trigger.stored(diskFile);
  }

  async get(origPath: string): Promise<DiskFile | null> {
    const path = await this.$hookManager.trigger.get(origPath);

    const result = await this.driver.get(path);
    if (!result) return null;

    const [stream, metadata] = result;
    let cachedStream: ReadableStream<Uint8Array> | null = stream;

    const filename = basename(path);
    const diskFile = await this.$hookManager.trigger.file(filename, metadata, async (file) => {
      if (cachedStream) {
        const s = cachedStream;
        cachedStream = null;
        return this.$hookManager.trigger.streaming(s, file);
      }
      const fetched = await this.driver.get(metadata.href);
      if (!fetched) throw new DiskReadError(metadata.href);
      return this.$hookManager.trigger.streaming(fetched[0], file);
    });

    return this.$hookManager.trigger.retrieved(diskFile);
  }

  async delete(path: string): Promise<string> {
    const href = await this.$hookManager.trigger.delete(path);
    await this.driver.delete(href);
    return this.$hookManager.trigger.deleted(href);
  }

  async exists(path: string): Promise<boolean> {
    path = await this.$hookManager.trigger.exists(path);
    const exists = await this.driver.exists(path);
    return this.$hookManager.trigger.checked(exists, path);
  }

  async url(path: string, urlOptions?: UrlOptions): Promise<string> {
    const url = await this.driver.url(path, urlOptions);
    return this.$hookManager.trigger.url(path, url, urlOptions);
  }

  async copy(from: File, to?: string): Promise<DiskFile>;
  async copy(from: string, to: string): Promise<DiskFile>;
  async copy(from: FileSource | File, to?: string): Promise<DiskFile> {
    if (from instanceof File) {
      const sourceDisk = getDisk(from);
      const isSameDisk = sourceDisk === this;

      if (isSameDisk) {
        if (!to) throw new Error(`Explicit target path required when copying within the same disk`);
        return this.copy((from as DiskFile).href, to);
      }

      // Different disk or plain File — stream transfer, default to from.name
      const targetKey = to ?? from.name;
      return this.put(targetKey, from);
    }

    // String source — same disk native copy
    const [$from, $to] = await this.$hookManager.trigger.copy(from, to!);
    await this.driver.copy($from, $to);
    const metadata = await this.driver.metadata($to);
    if (!metadata) throw new DiskMetadataError($to, "Failed to get metadata for copied file");
    const diskFile = await fileFromMetadata(this.driver, this.$hookManager.trigger, metadata);
    return this.$hookManager.trigger.copied($from, $to, diskFile);
  }

  async move(from: File, to?: string): Promise<DiskFile>;
  async move(from: string, to: string): Promise<DiskFile>;
  async move(from: FileSource | File, to?: string): Promise<DiskFile> {
    if (from instanceof File) {
      const sourceDisk = getDisk(from);
      const isSameDisk = sourceDisk === this;

      if (isSameDisk) {
        if (!to) throw new Error(`Explicit target path required when moving within the same disk`);
        return this.move((from as DiskFile).href, to);
      }

      // Cross-disk: stream to this disk, then delete from source
      const targetKey = to ?? from.name;
      const copied = await this.put(targetKey, from);
      if (sourceDisk && from instanceof DiskFile) {
        await sourceDisk.delete(from.href);
      }
      return copied;
    }

    // String source — same disk native move
    const [$from, $to] = await this.$hookManager.trigger.move(from, to!);
    await this.driver.move($from, $to);
    const metadata = await this.driver.metadata($to);
    if (!metadata) throw new DiskMetadataError($to, "Failed to get metadata for moved file");
    const diskFile = await fileFromMetadata(this.driver, this.$hookManager.trigger, metadata);
    return this.$hookManager.trigger.moved($from, $to, diskFile);
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    const [$prefix, $listOptions] = await this.$hookManager.trigger.list(prefix, listOptions);

    for await (const metadata of this.driver.list($prefix ?? "", $listOptions)) {
      yield fileFromMetadata(this.driver, this.$hookManager.trigger, metadata);
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<DiskFile> {
    yield* this.list(undefined, { recursive: true });
  }

  async metadata(path: string): Promise<FileMetadata | null> {
    return this.driver.metadata(path);
  }

  watch(pattern: string, options?: WatchOptions): FSWatcher | Promise<FSWatcher> {
    if (!this.driver.watch) {
      throw new Error(`Driver "${this.driver.name}" does not support file watching`);
    }
    return this.driver.watch(pattern, options);
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
    if (tag) return `${name} (${tag})`;
    return name;
  }
}
