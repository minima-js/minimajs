import { mkdir, rm, stat, access, copyFile, rename, readdir, writeFile, readFile, statfs, chmod } from "node:fs/promises";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { inspect } from "node:util";
import type { DiskDriver, PutOptions, UrlOptions, ListOptions, FileMetadata, WatchOptions } from "../types.js";
import type { FSWatcher } from "chokidar";

export interface FsDriverOptions {
  /** Root directory for file storage */
  root: string;
  /** Base URL for public file access */
  publicUrl?: string;
  /** File permission mode (default: 0o644) */
  fileMode?: number;
  /** Directory permission mode (default: 0o755) */
  dirMode?: number;
  /** Follow symbolic links (default: false) */
  followSymlinks?: boolean;
  /** Calculate checksums on put (default: false) */
  checksums?: boolean;
  /** Checksum algorithm (default: 'md5') */
  checksumAlgorithm?: "md5" | "sha256";
  /** Store custom metadata in sidecar files (default: false) */
  sidecarMetadata?: boolean;
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
  private readonly root: string;
  private readonly publicUrl?: string;
  private readonly fileMode: number;
  private readonly dirMode: number;
  private readonly followSymlinks: boolean;
  private readonly checksums: boolean;
  private readonly checksumAlgorithm: "md5" | "sha256";
  private readonly sidecarMetadata: boolean;

  constructor(options: FsDriverOptions) {
    this.root = resolve(options.root);
    this.publicUrl = options.publicUrl;
    this.fileMode = options.fileMode ?? 0o644;
    this.dirMode = options.dirMode ?? 0o755;
    this.followSymlinks = options.followSymlinks ?? false;
    this.checksums = options.checksums ?? false;
    this.checksumAlgorithm = options.checksumAlgorithm ?? "md5";
    this.sidecarMetadata = options.sidecarMetadata ?? false;
  }

  /**
   * Convert href to local file path
   * Handles both file:// URLs and public URLs
   */
  private hrefToPath(href: string): string {
    // If public URL is configured and href starts with it, convert to file path
    if (this.publicUrl && href.startsWith(this.publicUrl)) {
      const relativePath = href.slice(this.publicUrl.length).replace(/^\/+/, "");
      return resolve(this.root, relativePath);
    }

    // Handle file:// protocol
    const filepath = fileURLToPath(href);
    return resolve(this.root, relative("/", filepath));
  }

  /**
   * Get path to metadata sidecar file
   */
  private metadataPath(filepath: string): string {
    return `${filepath}.metadata.json`;
  }

  /**
   * Calculate checksum for a stream
   */
  private async calculateChecksum(
    stream: ReadableStream<Uint8Array>
  ): Promise<{ checksum: string; stream: ReadableStream<Uint8Array> }> {
    const hash = createHash(this.checksumAlgorithm);
    const chunks: Uint8Array[] = [];

    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        hash.update(value);
        chunks.push(value);
      }
    }

    const checksum = hash.digest("hex");

    // Recreate stream from stored chunks
    const newStream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return { checksum, stream: newStream };
  }

  /**
   * Save metadata to sidecar file
   */
  private async saveMetadata(filepath: string, metadata: Record<string, any>): Promise<void> {
    const metaPath = this.metadataPath(filepath);
    await writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
  }

  /**
   * Load metadata from sidecar file
   */
  private async loadMetadata(filepath: string): Promise<Record<string, any> | undefined> {
    const metaPath = this.metadataPath(filepath);
    try {
      const content = await readFile(metaPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const stats = await statfs(this.root);
    const blockSize = stats.bsize;
    const total = stats.blocks * blockSize;
    const free = stats.bfree * blockSize;
    const available = stats.bavail * blockSize;
    const used = total - free;

    return { total, free, used, available };
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions: PutOptions): Promise<FileMetadata> {
    const destination = this.hrefToPath(href);

    await mkdir(dirname(destination), { recursive: true, mode: this.dirMode });

    let finalStream = stream;
    let checksum: string | undefined;

    // Calculate checksum if enabled
    if (this.checksums) {
      const result = await this.calculateChecksum(finalStream);
      checksum = result.checksum;
      finalStream = result.stream;
    }

    // Create write pipeline
    const nodeReadable = Readable.fromWeb(finalStream as any);
    const writeStream = createWriteStream(destination, { mode: this.fileMode });

    await pipeline(nodeReadable, writeStream);

    const stats = await stat(destination);

    // Prepare metadata
    const metadata: Record<string, any> = {
      ...putOptions.metadata,
    };

    if (checksum) {
      metadata.checksum = checksum;
      metadata.checksumAlgorithm = this.checksumAlgorithm;
    }

    // Save sidecar metadata if enabled
    if (this.sidecarMetadata && putOptions.metadata) {
      await this.saveMetadata(destination, putOptions.metadata);
    }

    return {
      href: pathToFileURL(destination).href,
      size: stats.size,
      type: putOptions.type,
      lastModified: stats.mtime.getTime(),
      metadata,
    };
  }

  async get(href: string): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    const destination = this.hrefToPath(href);

    try {
      const stats = await stat(destination, { bigint: false });

      // Load sidecar metadata if enabled
      const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(destination) : undefined;

      // Create Node.js read stream
      const nodeStream = createReadStream(destination);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      const metadata: FileMetadata = {
        href: pathToFileURL(destination).href,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        metadata: sidecarMeta,
      };

      return [webStream, metadata];
    } catch {
      return null;
    }
  }

  async delete(href: string): Promise<void> {
    const destination = this.hrefToPath(href);

    // Delete main file
    await rm(destination, { force: true });

    // Delete sidecar metadata if it exists
    if (this.sidecarMetadata) {
      const metaPath = this.metadataPath(destination);
      await rm(metaPath, { force: true });
    }
  }

  async exists(href: string): Promise<boolean> {
    const destination = this.hrefToPath(href);

    try {
      await access(destination);
      return true;
    } catch {
      return false;
    }
  }

  async url(href: string, _urlOptions?: UrlOptions): Promise<string> {
    if (!this.publicUrl) {
      throw new Error("publicUrl is required to generate a url");
    }
    const destination = this.hrefToPath(href);
    const relativePath = relative(this.root, destination);
    return `${this.publicUrl.replace(/\/$/, "")}/${relativePath}`;
  }

  async copy(from: string, to: string): Promise<void> {
    const srcDest = this.hrefToPath(from);
    const destDest = this.hrefToPath(to);

    await mkdir(dirname(destDest), { recursive: true, mode: this.dirMode });
    await copyFile(srcDest, destDest);
    await chmod(destDest, this.fileMode);

    // Copy sidecar metadata if it exists
    if (this.sidecarMetadata) {
      const srcMeta = this.metadataPath(srcDest);
      const destMeta = this.metadataPath(destDest);
      try {
        await copyFile(srcMeta, destMeta);
      } catch {
        // Metadata file may not exist, ignore
      }
    }
  }

  async move(from: string, to: string): Promise<void> {
    const srcDest = this.hrefToPath(from);
    const destDest = this.hrefToPath(to);

    await mkdir(dirname(destDest), { recursive: true, mode: this.dirMode });
    await rename(srcDest, destDest);

    // Move sidecar metadata if it exists
    if (this.sidecarMetadata) {
      const srcMeta = this.metadataPath(srcDest);
      const destMeta = this.metadataPath(destDest);
      try {
        await rename(srcMeta, destMeta);
      } catch {
        // Metadata file may not exist, ignore
      }
    }
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<FileMetadata> {
    const searchPath = prefix ? join(this.root, prefix) : this.root;
    const recursive = listOptions?.recursive ?? true;
    let count = 0;
    const limit = listOptions?.limit;

    const walkDir = async function* (this: FsDriver, dir: string): AsyncGenerator<FileMetadata> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (limit !== undefined && count >= limit) return;

        const fullPath = join(dir, entry.name);

        // Skip metadata sidecar files
        if (this.sidecarMetadata && entry.name.endsWith(".metadata.json")) {
          continue;
        }

        // Skip .tmp directory
        if (entry.name === ".tmp") {
          continue;
        }

        // Handle symlinks
        if (entry.isSymbolicLink()) {
          if (!this.followSymlinks) continue;

          try {
            const stats = await stat(fullPath);
            if (stats.isFile()) {
              // Load sidecar metadata if enabled
              const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(fullPath) : undefined;

              yield {
                href: pathToFileURL(fullPath).href,
                size: stats.size,
                lastModified: stats.mtime.getTime(),
                metadata: sidecarMeta,
              };
              count++;
            } else if (stats.isDirectory() && recursive) {
              yield* walkDir.call(this, fullPath);
            }
          } catch {
            // Broken symlink, skip
            continue;
          }
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(fullPath) : undefined;

          yield {
            href: pathToFileURL(fullPath).href,
            size: stats.size,
            lastModified: stats.mtime.getTime(),
            metadata: sidecarMeta,
          };
          count++;
        } else if (entry.isDirectory() && recursive) {
          yield* walkDir.call(this, fullPath);
        }
      }
    }.bind(this);

    yield* walkDir(searchPath);
  }

  async getMetadata(href: string): Promise<FileMetadata | null> {
    const destination = this.hrefToPath(href);

    try {
      const stats = await stat(destination);
      const sidecarMeta = this.sidecarMetadata ? await this.loadMetadata(destination) : undefined;

      return {
        href: pathToFileURL(destination).href,
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

    // Lazy load chokidar
    let chokidar: typeof import("chokidar");
    try {
      chokidar = await import("chokidar");
    } catch (error) {
      throw new Error(
        "chokidar is required for file watching. Install it with: npm install chokidar\nOr with bun: bun add chokidar"
      );
    }

    // Resolve full path
    const watchPath = pattern.startsWith("/") ? pattern : join(this.root, pattern);

    // Create and return chokidar watcher directly
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
      checksums: this.checksums,
      sidecarMetadata: this.sidecarMetadata,
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
