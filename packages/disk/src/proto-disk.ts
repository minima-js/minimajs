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
  WatchOptions,
} from "./types.js";
import { DiskFile } from "./file.js";
import { fileFromMetadata, getDisk, ensureMetadataSymbols } from "./helpers.js";
import { DiskReadError, DiskFileNotFoundError, DiskMetadataError, DiskConfigError } from "./errors.js";
import { pathToFileURL } from "node:url";
import { basename } from "node:path";
import { inspect } from "node:util";
import { HookManager } from "./hooks/manager.js";
import { type DiskHooks } from "./hooks/types.js";
import type { FSWatcher } from "chokidar";

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
    this.$hookManager = new HookManager(this, hooks);

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
  hook<K extends keyof DiskHooks>(event: K, handler: NonNullable<DiskHooks[K]>): () => void {
    this.$hookManager.add(event, handler);
    return () => this.$hookManager.remove(event, handler);
  }

  /**
   * Get driver for a given href based on longest matching prefix
   */
  public getDriver(href: string): DiskDriver {
    for (const prefix of this.sortedPrefixes) {
      if (href.startsWith(prefix)) {
        const driver = this.protocols[prefix];
        if (driver) return driver;
      }
    }
    throw new Error(`No driver registered for href: ${href}\nAvailable prefixes: ${this.sortedPrefixes.join(", ")}`);
  }

  /**
   * Convert user-provided path to absolute href with protocol
   */
  private toHref(path: string): string {
    if (path.includes("://")) return path;

    if (this.defaultProtocol === "file://") {
      return pathToFileURL(path.startsWith("/") ? path : `${this.basePath}/${path}`).href;
    }

    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.defaultProtocol}${this.basePath ? `${this.basePath}/` : ""}${normalizedPath}`;
  }

  async put(data: File, putOptions?: PutOptions): Promise<DiskFile>;
  async put(path: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile>;
  async put(pathOrData: string | File, dataOrOptions?: DiskData | PutOptions, putOptions?: PutOptions): Promise<DiskFile> {
    if (pathOrData instanceof File) {
      const mergedOptions: PutOptions = (dataOrOptions as PutOptions) ?? {};
      mergedOptions.type ??= pathOrData.type;
      return this.put(pathOrData.name, pathOrData, mergedOptions);
    }

    const [path, stream, options] = await this.$hookManager.trigger.put(
      pathOrData as string,
      dataOrOptions as DiskData,
      putOptions ?? {}
    );

    const href = this.toHref(path);
    const driver = this.getDriver(href);
    const storingStream = await this.$hookManager.trigger.storing(path, stream, options);

    let metadata;
    try {
      metadata = await driver.put(href, storingStream, options);
    } catch (error) {
      return this.$hookManager.trigger.putFailed(error, path, storingStream, options);
    }

    // Preserve plugin-private symbol metadata even when drivers only persist string keys.
    if (options.metadata) {
      ensureMetadataSymbols(options.metadata, metadata.metadata);
    }

    const diskFile = await fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
    return this.$hookManager.trigger.stored(diskFile);
  }

  async get(path: string, options: { signal?: AbortSignal } = {}): Promise<DiskFile | null> {
    const href = this.toHref(await this.$hookManager.trigger.get(path));
    const driver = this.getDriver(href);

    let result;
    try {
      result = await driver.get(href, options);
    } catch (error) {
      return this.$hookManager.trigger.getFailed(error, href);
    }

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
      const fileDriver = this.getDriver(metadata.href);
      const fetched = await fileDriver.get(metadata.href, {});
      if (!fetched) throw new DiskReadError(metadata.href);
      return this.$hookManager.trigger.streaming(fetched[0], file);
    });

    return this.$hookManager.trigger.retrieved(diskFile);
  }

  async delete(source: FileSource, options: { signal?: AbortSignal } = {}): Promise<string> {
    const href = this.toHref(await this.$hookManager.trigger.delete(source));
    const driver = this.getDriver(href);
    try {
      await driver.delete(href, options);
    } catch (error) {
      return this.$hookManager.trigger.deleteFailed(error, href);
    }
    return this.$hookManager.trigger.deleted(href);
  }

  async exists(path: string, options: { signal?: AbortSignal } = {}): Promise<boolean> {
    const href = this.toHref(await this.$hookManager.trigger.exists(path));
    const driver = this.getDriver(href);
    const exists = await driver.exists(href, options);
    return this.$hookManager.trigger.checked(exists, href);
  }

  async url(path: string, urlOptions: UrlOptions = {}): Promise<string> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    const url = await driver.url(href, urlOptions);
    return this.$hookManager.trigger.url(href, url, urlOptions);
  }

  async copy(from: File, to?: string, options?: { signal?: AbortSignal }): Promise<DiskFile>;
  async copy(from: FileSource, to: string, options?: { signal?: AbortSignal }): Promise<DiskFile>;
  async copy(from: FileSource | File, to?: string, options: { signal?: AbortSignal } = {}): Promise<DiskFile> {
    if (from instanceof DiskFile) {
      if ((getDisk(from) as unknown) === this) {
        if (!to) throw new Error(`Explicit target path required when copying within the same disk`);
        return this.copy(from.href, to, options);
      }
      return this.put(to ?? from.name, from);
    }
    if (from instanceof File) {
      return this.put(to ?? from.name, from);
    }
    const [$from, $to] = await this.$hookManager.trigger.copy(from, to!);

    const fromHrefResolved = this.toHref($from);
    const toHrefResolved = this.toHref($to);

    const sourceDriver = this.getDriver(fromHrefResolved);
    const destDriver = this.getDriver(toHrefResolved);

    let diskFile: DiskFile;

    if (sourceDriver === destDriver) {
      await sourceDriver.copy(fromHrefResolved, toHrefResolved, options);
      const metadata = await destDriver.metadata(toHrefResolved, options);
      if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for copied file");

      diskFile = await fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
    } else {
      // Different drivers: stream data between them
      const result = await sourceDriver.get(fromHrefResolved, options);
      if (!result) throw new DiskFileNotFoundError(fromHrefResolved);

      const [srcStream, sourceMetadata] = result;
      const metadata = await destDriver.put(toHrefResolved, srcStream, {
        type: sourceMetadata.type,
        lastModified: sourceMetadata.lastModified,
        metadata: sourceMetadata.metadata,
      });

      diskFile = await fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
    }

    return this.$hookManager.trigger.copied($from, $to, diskFile);
  }

  async move(from: File, to?: string, options?: { signal?: AbortSignal }): Promise<DiskFile>;
  async move(from: FileSource, to: string, options?: { signal?: AbortSignal }): Promise<DiskFile>;
  async move(from: FileSource | File, to?: string, options: { signal?: AbortSignal } = {}): Promise<DiskFile> {
    if (from instanceof DiskFile) {
      const sourceDisk = getDisk(from);
      if ((sourceDisk as unknown) === this) {
        if (!to) throw new Error(`Explicit target path required when moving within the same disk`);
        return this.move(from.href, to, options);
      }
      const copied = await this.put(to ?? from.name, from);
      if (sourceDisk) {
        await sourceDisk.delete(from.href);
      }
      return copied;
    }
    if (from instanceof File) {
      return this.put(to ?? from.name, from);
    }
    const [$from, $to] = await this.$hookManager.trigger.move(from, to!);

    const fromHrefResolved = this.toHref($from);
    const toHrefResolved = this.toHref($to);

    const sourceDriver = this.getDriver(fromHrefResolved);
    const destDriver = this.getDriver(toHrefResolved);

    let diskFile: DiskFile;

    if (sourceDriver === destDriver) {
      await sourceDriver.move(fromHrefResolved, toHrefResolved, options);
      const metadata = await destDriver.metadata(toHrefResolved, options);
      if (!metadata) throw new DiskMetadataError(toHrefResolved, "Failed to get metadata for moved file");

      diskFile = await fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
    } else {
      // Different drivers: copy then delete
      const result = await sourceDriver.get(fromHrefResolved, options);
      if (!result) throw new DiskFileNotFoundError(fromHrefResolved);

      const [srcStream, sourceMetadata] = result;
      const metadata = await destDriver.put(toHrefResolved, srcStream, {
        type: sourceMetadata.type,
        lastModified: sourceMetadata.lastModified,
        metadata: sourceMetadata.metadata,
      });

      await sourceDriver.delete(fromHrefResolved, options);

      diskFile = await fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
    }

    return this.$hookManager.trigger.moved($from, $to, diskFile);
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
    const [$prefix, $options] = await this.$hookManager.trigger.list(prefix, listOptions);
    const prefixHref = $prefix ? this.toHref($prefix) : undefined;

    if (prefixHref) {
      const driver = this.getDriver(prefixHref);
      for await (const metadata of driver.list(prefixHref, $options)) {
        yield fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
      }
      return;
    }

    // No prefix: list from all drivers
    for (const [_protocol, driver] of Object.entries(this.protocols)) {
      try {
        for await (const metadata of driver.list("", $options)) {
          yield fileFromMetadata(this.getDriver(metadata.href), this.$hookManager.trigger, metadata);
        }
      } catch (_error) {
        // Skip drivers that don't support listing without prefix
      }
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<DiskFile> {
    yield* this.list();
  }

  async metadata(path: string, options: { signal?: AbortSignal } = {}): Promise<FileMetadata | null> {
    const href = this.toHref(path);
    const driver = this.getDriver(href);
    return driver.metadata(href, options);
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
