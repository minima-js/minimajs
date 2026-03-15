import { mkdir, rm, stat, access, copyFile, rename, readdir, writeFile, readFile, statfs, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspect } from "node:util";
import type {
  DiskDriver,
  DriverCapabilities,
  PutOptions,
  UrlOptions,
  ListOptions,
  FileMetadata,
  WatchOptions,
} from "../types.js";
import { DiskAccessError, DiskConfigError } from "../errors.js";
import type { FSWatcher } from "chokidar";

export interface MetadataSerializer {
  serialize(data: Record<string, unknown>): string;
  deserialize(raw: string): Record<string, unknown>;
}

export interface SidecarMetadataOptions {
  /**
   * File extension appended to the original filename for the sidecar
   * @default '.metadata.json'
   */
  extension?: string;
  /**
   * Custom serializer — defaults to pretty-printed JSON
   */
  serializer?: MetadataSerializer;
}

export interface FsDriverBaseOptions {
  /**
   * Root directory as a `file://` URL — **must end with a trailing slash**.
   * @example "file:///var/storage/"
   */
  root: string;
  /** Base URL for public file access */
  publicUrl?: string;
  /** File permission mode (default: 0o644) */
  fileMode?: number;
  /** Directory permission mode (default: 0o755) */
  dirMode?: number;
  /** Follow symbolic links (default: false) */
  followSymlinks?: boolean;
  /**
   * Store custom metadata in sidecar files.
   * Pass `true` to enable with defaults, or an options object to customize
   * the file extension and serialization format.
   * @default false
   */
  sidecarMetadata?: boolean | SidecarMetadataOptions;
}

export interface StorageInfo {
  total: number;
  free: number;
  used: number;
  available: number;
}

const sidecarSerializer: MetadataSerializer = {
  serialize: (data) => JSON.stringify(data, null, 2),
  deserialize: (raw) => JSON.parse(raw),
};

/**
 * Filesystem storage driver for @minimajs/disk
 */
export class FsDriver implements DiskDriver {
  readonly name = "fs";
  /** Root as a `file://` URL — always ends with "/" (enforced in constructor) */
  private readonly root: URL;
  private readonly publicUrl?: string;
  private readonly fileMode: number;
  private readonly dirMode: number;
  private readonly followSymlinks: boolean;
  private readonly sidecar = { enabled: false, extension: ".metadata.json", serializer: sidecarSerializer };

  get capabilities(): DriverCapabilities {
    return { metadata: this.sidecar.enabled };
  }

  constructor(options: FsDriverBaseOptions) {
    if (!options.root.startsWith("file://") || !options.root.endsWith("/")) {
      throw new DiskConfigError(
        `FsDriver root must be a file:// URL ending with "/" (e.g. "file:///var/storage/"), got: "${options.root}"`
      );
    }
    this.root = new URL(options.root);
    this.publicUrl = options.publicUrl;
    this.fileMode = options.fileMode ?? 0o644;
    this.dirMode = options.dirMode ?? 0o755;
    this.followSymlinks = options.followSymlinks ?? false;
    this.sidecar.enabled = Boolean(options.sidecarMetadata);
    if (typeof options.sidecarMetadata === "object") {
      Object.assign(this.sidecar, options.sidecarMetadata);
    }
  }

  /** Throw DiskAccessError if url is outside root */
  private assertWithinRoot(url: URL, label: string): void {
    // Trailing slash on root prevents prefix-collision (e.g. file:///root-evil/)
    if (!url.href.startsWith(this.root.href)) throw new DiskAccessError(label);
  }

  /**
   * Resolve any href to a canonical `file://` URL validated within root.
   * Accepts: relative keys ("hello.txt"), file:// URLs, or public URLs.
   */
  private resolveURL(href: string): URL {
    const key =
      this.publicUrl && href.startsWith(this.publicUrl) ? href.slice(this.publicUrl.length).replace(/^\/+/, "") : href;

    const resolved = new URL(key, this.root);
    this.assertWithinRoot(resolved, href);
    return resolved;
  }

  /** Sidecar metadata URL — append extension in URL space */
  private sidecarUrl(fileUrl: URL): URL {
    return new URL(`${fileUrl.href}${this.sidecar.extension}`);
  }

  private async saveMetadata(
    fileUrl: URL,
    metadata: Record<string, any>,
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    await writeFile(this.sidecarUrl(fileUrl), this.sidecar.serializer.serialize(metadata), {
      encoding: "utf-8",
      signal: options.signal,
    });
  }

  private async loadMetadata(
    fileUrl: URL,
    options: { signal?: AbortSignal } = {}
  ): Promise<Record<string, any> | undefined> {
    if (!this.sidecar.enabled) return;
    try {
      const content = await readFile(this.sidecarUrl(fileUrl), { encoding: "utf-8", signal: options.signal });
      return this.sidecar.serializer.deserialize(content);
    } catch {
      return undefined;
    }
  }

  async storageInfo(): Promise<StorageInfo> {
    const stats = await statfs(this.root);
    const blockSize = stats.bsize;
    const total = stats.blocks * blockSize;
    const free = stats.bfree * blockSize;
    const available = stats.bavail * blockSize;
    const used = total - free;

    return { total, free, used, available };
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions: PutOptions): Promise<FileMetadata> {
    putOptions.signal?.throwIfAborted();
    const fileUrl = this.resolveURL(href);

    await mkdir(new URL(".", fileUrl), { recursive: true, mode: this.dirMode });

    const nodeReadable = Readable.fromWeb(stream);
    const writeStream = createWriteStream(fileUrl, { mode: this.fileMode });

    await pipeline(nodeReadable, writeStream, { signal: putOptions.signal });

    const stats = await stat(fileUrl);

    if (this.sidecar.enabled && putOptions.metadata) {
      await this.saveMetadata(fileUrl, putOptions.metadata, { signal: putOptions.signal });
    }

    const metadata: Record<string, any> = { ...putOptions.metadata };
    return {
      href: fileUrl.href,
      size: stats.size,
      type: putOptions.type,
      lastModified: stats.mtime.getTime(),
      metadata,
    };
  }

  async get(href: string, options: { signal?: AbortSignal }): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    options.signal?.throwIfAborted();
    const fileUrl = this.resolveURL(href);

    try {
      const stats = await stat(fileUrl, { bigint: false });
      const nodeStream = createReadStream(fileUrl);
      return [
        Readable.toWeb(nodeStream),
        {
          href: fileUrl.href,
          size: stats.size,
          lastModified: stats.mtime.getTime(),
          metadata: await this.loadMetadata(fileUrl, options),
        },
      ];
    } catch {
      return null;
    }
  }

  async delete(href: string, options: { signal?: AbortSignal }): Promise<void> {
    options.signal?.throwIfAborted();
    const fileUrl = this.resolveURL(href);

    await rm(fileUrl, { force: true });

    if (this.sidecar.enabled) {
      await rm(this.sidecarUrl(fileUrl), { force: true });
    }
  }

  async exists(href: string, options: { signal?: AbortSignal }): Promise<boolean> {
    options?.signal?.throwIfAborted();
    const fileUrl = this.resolveURL(href);

    try {
      await access(fileUrl);
      return true;
    } catch {
      return false;
    }
  }

  async url(href: string, _urlOptions?: UrlOptions): Promise<string> {
    if (!this.publicUrl) {
      throw new Error("publicUrl is required to generate a url");
    }
    const fileUrl = this.resolveURL(href);
    const relativePath = fileUrl.href.slice(this.root.href.length);
    return `${this.publicUrl.replace(/\/$/, "")}/${relativePath}`;
  }

  async copy(from: string, to: string, options: { signal?: AbortSignal }): Promise<void> {
    options?.signal?.throwIfAborted();
    const srcUrl = this.resolveURL(from);
    const destUrl = this.resolveURL(to);

    await mkdir(new URL(".", destUrl), { recursive: true, mode: this.dirMode });
    await copyFile(srcUrl, destUrl);
    await chmod(destUrl, this.fileMode);

    if (this.sidecar.enabled) {
      try {
        await copyFile(this.sidecarUrl(srcUrl), this.sidecarUrl(destUrl));
      } catch {
        // Sidecar may not exist
      }
    }
  }

  async move(from: string, to: string, options: { signal?: AbortSignal }): Promise<void> {
    options.signal?.throwIfAborted();
    const srcUrl = this.resolveURL(from);
    const destUrl = this.resolveURL(to);

    await mkdir(new URL(".", destUrl), { recursive: true, mode: this.dirMode });
    await rename(srcUrl, destUrl);

    if (this.sidecar.enabled) {
      try {
        await rename(this.sidecarUrl(srcUrl), this.sidecarUrl(destUrl));
      } catch {
        // Sidecar may not exist
      }
    }
  }

  async *list(prefix: string, listOptions: ListOptions): AsyncIterable<FileMetadata> {
    const searchUrl = new URL(prefix, this.root);
    this.assertWithinRoot(searchUrl, prefix);

    const recursive = listOptions?.recursive ?? true;
    let count = 0;
    const limit = listOptions?.limit;

    const walkDir = async function* (this: FsDriver, dirUrl: URL): AsyncGenerator<FileMetadata> {
      // Ensure trailing slash so child URLs resolve correctly
      if (!dirUrl.href.endsWith("/")) dirUrl = new URL(dirUrl.href + "/");
      let entries;
      try {
        entries = await readdir(dirUrl, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (limit !== undefined && count >= limit) return;
        listOptions.signal?.throwIfAborted();

        if (this.sidecar.enabled && entry.name.endsWith(this.sidecar.extension)) continue;
        if (entry.name === ".tmp") continue;

        const childUrl = new URL(encodeURIComponent(entry.name), dirUrl);

        if (entry.isSymbolicLink()) {
          if (!this.followSymlinks) continue;
          try {
            const stats = await stat(childUrl);
            if (stats.isFile()) {
              yield {
                href: childUrl.href,
                size: stats.size,
                lastModified: stats.mtime.getTime(),
                metadata: await this.loadMetadata(childUrl, { signal: listOptions.signal }),
              };
              count++;
            } else if (stats.isDirectory() && recursive) {
              yield* walkDir.call(this, new URL(encodeURIComponent(entry.name) + "/", dirUrl));
            }
          } catch {
            continue; // Broken symlink
          }
        } else if (entry.isFile()) {
          const stats = await stat(childUrl);
          yield {
            href: childUrl.href,
            size: stats.size,
            lastModified: stats.mtime.getTime(),
            metadata: await this.loadMetadata(childUrl, { signal: listOptions.signal }),
          };
          count++;
        } else if (entry.isDirectory() && recursive) {
          yield* walkDir.call(this, new URL(encodeURIComponent(entry.name) + "/", dirUrl));
        }
      }
    }.bind(this);

    yield* walkDir(searchUrl);
  }

  async metadata(href: string, options: { signal?: AbortSignal }): Promise<FileMetadata | null> {
    options.signal?.throwIfAborted();
    const fileUrl = this.resolveURL(href);

    try {
      const stats = await stat(fileUrl);
      const sidecarMeta = this.sidecar.enabled ? await this.loadMetadata(fileUrl, options) : undefined;

      return {
        href: fileUrl.href,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        metadata: sidecarMeta,
      };
    } catch {
      return null;
    }
  }

  /**
   * Watch files for changes using chokidar
   */
  async watch(pattern: string, options?: WatchOptions): Promise<FSWatcher> {
    const { recursive = true, ignoreInitial = true, chokidar: chokidarOpts = {} } = options || {};

    let chokidar: typeof import("chokidar");
    try {
      chokidar = await import("chokidar");
    } catch {
      throw new Error(
        "chokidar is required for file watching. Install it with: npm install chokidar\nOr with bun: bun add chokidar"
      );
    }

    // Resolve pattern within root, then convert to path for chokidar
    const watchPath = fileURLToPath(new URL(pattern, this.root));

    return chokidar.watch(watchPath, {
      persistent: true,
      ignoreInitial,
      depth: recursive ? undefined : 0,
      ...chokidarOpts,
    });
  }

  [inspect.custom]() {
    return {
      name: this.name,
      root: this.root.href,
      publicUrl: this.publicUrl,
      sidecarMetadata: Boolean(this.sidecar.enabled),
      [Symbol.toStringTag]: "FsDriver",
    };
  }

  get [Symbol.toStringTag]() {
    return "FsDriver";
  }
}
