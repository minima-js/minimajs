import { mkdir, rm, stat, access, copyFile, rename, readdir, writeFile, readFile, statfs, chmod } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspect } from "node:util";
import type { DiskDriver, PutOptions, UrlOptions, ListOptions, FileMetadata, WatchOptions } from "../types.js";
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

export interface FsDriverOptions {
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

/**
 * Filesystem storage driver for @minimajs/disk
 */
export class FsDriver implements DiskDriver {
  readonly name = "fs";
  /** Root as a `file://` URL — always ends with "/" (enforced in constructor) */
  private readonly root: string;
  private readonly publicUrl?: string;
  private readonly fileMode: number;
  private readonly dirMode: number;
  private readonly followSymlinks: boolean;
  private readonly sidecarMetadata: boolean;
  private readonly metadataExtension: string;
  private readonly metadataSerializer: MetadataSerializer;

  constructor(options: FsDriverOptions) {
    if (!options.root.startsWith("file://") || !options.root.endsWith("/")) {
      throw new DiskConfigError(
        `FsDriver root must be a file:// URL ending with "/" (e.g. "file:///var/storage/"), got: "${options.root}"`
      );
    }
    this.root = options.root;
    this.publicUrl = options.publicUrl;
    this.fileMode = options.fileMode ?? 0o644;
    this.dirMode = options.dirMode ?? 0o755;
    this.followSymlinks = options.followSymlinks ?? false;
    const sidecar = options.sidecarMetadata;
    this.sidecarMetadata = !!sidecar;
    const sidecarOpts = typeof sidecar === "object" ? sidecar : {};
    this.metadataExtension = sidecarOpts.extension ?? ".metadata.json";
    this.metadataSerializer = sidecarOpts.serializer ?? {
      serialize: (data) => JSON.stringify(data, null, 2),
      deserialize: (raw) => JSON.parse(raw),
    };
  }

  /**
   * Resolve any href to a canonical `file://` URL validated within root.
   * Accepts: relative keys ("hello.txt"), file:// URLs, or public URLs.
   */
  private resolveHref(href: string): string {
    const key =
      this.publicUrl && href.startsWith(this.publicUrl) ? href.slice(this.publicUrl.length).replace(/^\/+/, "") : href;

    const resolvedUrl = new URL(key, this.root).href;

    // Trailing slash on root prevents prefix-collision (e.g. file:///root-evil/)
    if (!resolvedUrl.startsWith(this.root)) {
      throw new DiskAccessError(href);
    }

    return resolvedUrl;
  }

  /** Sidecar metadata URL — append extension in URL space */
  private sidecarUrl(fileUrl: string): string {
    return `${fileUrl}${this.metadataExtension}`;
  }

  private async saveMetadata(fileUrl: string, metadata: Record<string, any>): Promise<void> {
    await writeFile(new URL(this.sidecarUrl(fileUrl)), this.metadataSerializer.serialize(metadata), "utf-8");
  }

  private async loadMetadata(fileUrl: string): Promise<Record<string, any> | undefined> {
    try {
      const content = await readFile(new URL(this.sidecarUrl(fileUrl)), "utf-8");
      return this.metadataSerializer.deserialize(content);
    } catch {
      return undefined;
    }
  }

  async storageInfo(): Promise<StorageInfo> {
    const stats = await statfs(new URL(this.root));
    const blockSize = stats.bsize;
    const total = stats.blocks * blockSize;
    const free = stats.bfree * blockSize;
    const available = stats.bavail * blockSize;
    const used = total - free;

    return { total, free, used, available };
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions: PutOptions): Promise<FileMetadata> {
    const fileUrl = this.resolveHref(href);

    // new URL(".", fileUrl) resolves to the parent directory URL
    await mkdir(new URL(".", fileUrl), { recursive: true, mode: this.dirMode });

    const nodeReadable = Readable.fromWeb(stream as any);
    const writeStream = createWriteStream(new URL(fileUrl), { mode: this.fileMode });

    await pipeline(nodeReadable, writeStream);

    const stats = await stat(new URL(fileUrl));

    const metadata: Record<string, any> = { ...putOptions.metadata };

    if (this.sidecarMetadata && putOptions.metadata) {
      await this.saveMetadata(fileUrl, putOptions.metadata);
    }

    return {
      href: fileUrl,
      size: stats.size,
      type: putOptions.type,
      lastModified: stats.mtime.getTime(),
      metadata,
    };
  }

  async get(href: string): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    const fileUrl = this.resolveHref(href);

    try {
      const stats = await stat(new URL(fileUrl), { bigint: false });
      const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(fileUrl) : undefined;

      const nodeStream = createReadStream(new URL(fileUrl));
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      return [
        webStream,
        {
          href: fileUrl,
          size: stats.size,
          lastModified: stats.mtime.getTime(),
          metadata: sidecarMeta,
        },
      ];
    } catch {
      return null;
    }
  }

  async delete(href: string): Promise<void> {
    const fileUrl = this.resolveHref(href);

    await rm(new URL(fileUrl), { force: true });

    if (this.sidecarMetadata) {
      await rm(new URL(this.sidecarUrl(fileUrl)), { force: true });
    }
  }

  async exists(href: string): Promise<boolean> {
    const fileUrl = this.resolveHref(href);

    try {
      await access(new URL(fileUrl));
      return true;
    } catch {
      return false;
    }
  }

  async url(href: string, _urlOptions?: UrlOptions): Promise<string> {
    if (!this.publicUrl) {
      throw new Error("publicUrl is required to generate a url");
    }
    const fileUrl = this.resolveHref(href);
    // Strip root prefix to get the relative segment, append to publicUrl
    const relativePath = fileUrl.slice(this.root.length);
    return `${this.publicUrl.replace(/\/$/, "")}/${relativePath}`;
  }

  async copy(from: string, to: string): Promise<void> {
    const srcUrl = this.resolveHref(from);
    const destUrl = this.resolveHref(to);

    await mkdir(new URL(".", destUrl), { recursive: true, mode: this.dirMode });
    await copyFile(new URL(srcUrl), new URL(destUrl));
    await chmod(new URL(destUrl), this.fileMode);

    if (this.sidecarMetadata) {
      try {
        await copyFile(new URL(this.sidecarUrl(srcUrl)), new URL(this.sidecarUrl(destUrl)));
      } catch {
        // Sidecar may not exist
      }
    }
  }

  async move(from: string, to: string): Promise<void> {
    const srcUrl = this.resolveHref(from);
    const destUrl = this.resolveHref(to);

    await mkdir(new URL(".", destUrl), { recursive: true, mode: this.dirMode });
    await rename(new URL(srcUrl), new URL(destUrl));

    if (this.sidecarMetadata) {
      try {
        await rename(new URL(this.sidecarUrl(srcUrl)), new URL(this.sidecarUrl(destUrl)));
      } catch {
        // Sidecar may not exist
      }
    }
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<FileMetadata> {
    const searchUrl = prefix ? new URL(prefix, this.root).href : this.root;
    if (!searchUrl.startsWith(this.root)) throw new DiskAccessError(prefix ?? "");

    const recursive = listOptions?.recursive ?? true;
    let count = 0;
    const limit = listOptions?.limit;

    const walkDir = async function* (this: FsDriver, dirUrl: string): AsyncGenerator<FileMetadata> {
      let entries;
      try {
        // readdir needs a path; dirUrl is always within root so this is safe
        entries = await readdir(fileURLToPath(dirUrl), { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (limit !== undefined && count >= limit) return;

        if (this.sidecarMetadata && entry.name.endsWith(this.metadataExtension)) continue;
        if (entry.name === ".tmp") continue;

        // Build child URL via path join to correctly handle filenames with special chars
        const childUrl = pathToFileURL(join(fileURLToPath(dirUrl), entry.name)).href;

        if (entry.isSymbolicLink()) {
          if (!this.followSymlinks) continue;
          try {
            const stats = await stat(new URL(childUrl));
            if (stats.isFile()) {
              const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(childUrl) : undefined;
              yield { href: childUrl, size: stats.size, lastModified: stats.mtime.getTime(), metadata: sidecarMeta };
              count++;
            } else if (stats.isDirectory() && recursive) {
              yield* walkDir.call(this, childUrl + "/");
            }
          } catch {
            continue; // Broken symlink
          }
        } else if (entry.isFile()) {
          const stats = await stat(new URL(childUrl));
          const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(childUrl) : undefined;
          yield { href: childUrl, size: stats.size, lastModified: stats.mtime.getTime(), metadata: sidecarMeta };
          count++;
        } else if (entry.isDirectory() && recursive) {
          yield* walkDir.call(this, childUrl + "/");
        }
      }
    }.bind(this);

    yield* walkDir(searchUrl);
  }

  async metadata(href: string): Promise<FileMetadata | null> {
    const fileUrl = this.resolveHref(href);

    try {
      const stats = await stat(new URL(fileUrl));
      const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(fileUrl) : undefined;

      return {
        href: fileUrl,
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
    const watchUrl = new URL(pattern, this.root).href;
    const watchPath = fileURLToPath(watchUrl);

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
      root: this.root,
      publicUrl: this.publicUrl,
      sidecarMetadata: Boolean(this.sidecarMetadata),
      [Symbol.toStringTag]: "FsDriver",
    };
  }

  get [Symbol.toStringTag]() {
    return "FsDriver";
  }
}

export function createFsDriver(options: FsDriverOptions): DiskDriver {
  return new FsDriver(options);
}
