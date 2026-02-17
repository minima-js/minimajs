import { mkdir, rm, stat, access, copyFile, rename, readdir } from "node:fs/promises";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { DiskDriver, PutOptions, UrlOptions, ListOptions, FileMetadata } from "../types.js";
import { getMimeType } from "../helpers.js";

export interface FsDriverOptions {
  /** Root directory for file storage */
  root: string;
  /** Base URL for public file access */
  publicUrl?: string;
}

/**
 * Filesystem storage driver for @minimajs/disk
 */
export class FsDriver implements DiskDriver {
  readonly name = "fs";
  private readonly root: string;
  private readonly publicUrl?: string;

  constructor(options: FsDriverOptions) {
    this.root = resolve(options.root);
    this.publicUrl = options.publicUrl;
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions?: PutOptions): Promise<FileMetadata> {
    const filepath = fileURLToPath(href);
    const destination = resolve(this.root, relative("/", filepath));

    await mkdir(dirname(destination), { recursive: true });

    // Stream directly to file using pipeline
    await pipeline(Readable.fromWeb(stream as any), createWriteStream(destination));

    const stats = await stat(destination);

    return {
      href: pathToFileURL(destination).href,
      size: stats.size,
      type: putOptions?.type ?? getMimeType(destination),
      lastModified: stats.mtime.getTime(),
      metadata: putOptions?.metadata,
    };
  }

  async get(href: string): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    const filepath = fileURLToPath(href);
    const destination = resolve(this.root, relative("/", filepath));

    try {
      const stats = await stat(destination);

      // Create web ReadableStream from Node.js stream
      const nodeStream = createReadStream(destination);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      const metadata: FileMetadata = {
        href: pathToFileURL(destination).href,
        size: stats.size,
        type: getMimeType(destination),
        lastModified: stats.mtime.getTime(),
      };

      return [webStream, metadata];
    } catch {
      return null;
    }
  }

  async delete(href: string): Promise<void> {
    const filepath = fileURLToPath(href);
    const destination = resolve(this.root, relative("/", filepath));
    await rm(destination, { force: true });
  }

  async exists(href: string): Promise<boolean> {
    const filepath = fileURLToPath(href);
    const destination = resolve(this.root, relative("/", filepath));
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
    const filepath = fileURLToPath(href);
    const relativePath = relative(this.root, resolve(this.root, relative("/", filepath)));
    return `${this.publicUrl.replace(/\/$/, "")}/${relativePath}`;
  }

  async copy(from: string, to: string): Promise<void> {
    const srcPath = fileURLToPath(from);
    const destPath = fileURLToPath(to);
    const srcDest = resolve(this.root, relative("/", srcPath));
    const destDest = resolve(this.root, relative("/", destPath));

    await mkdir(dirname(destDest), { recursive: true });
    await copyFile(srcDest, destDest);
  }

  async move(from: string, to: string): Promise<void> {
    const srcPath = fileURLToPath(from);
    const destPath = fileURLToPath(to);
    const srcDest = resolve(this.root, relative("/", srcPath));
    const destDest = resolve(this.root, relative("/", destPath));

    await mkdir(dirname(destDest), { recursive: true });
    await rename(srcDest, destDest);
  }

  async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<FileMetadata> {
    const searchPath = prefix ? join(this.root, prefix) : this.root;
    const recursive = listOptions?.recursive ?? true;
    let count = 0;
    const limit = listOptions?.limit;

    async function* walkDir(dir: string): AsyncGenerator<FileMetadata> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (limit !== undefined && count >= limit) return;

        const fullPath = join(dir, entry.name);

        if (entry.isFile()) {
          const stats = await stat(fullPath);
          yield {
            href: pathToFileURL(fullPath).href,
            size: stats.size,
            type: getMimeType(fullPath),
            lastModified: stats.mtime.getTime(),
          };
          count++;
        } else if (entry.isDirectory() && recursive) {
          yield* walkDir(fullPath);
        }
      }
    }

    yield* walkDir(searchPath);
  }

  async getMetadata(href: string): Promise<FileMetadata | null> {
    const filepath = fileURLToPath(href);
    const destination = resolve(this.root, relative("/", filepath));

    try {
      const stats = await stat(destination);
      return {
        href: pathToFileURL(destination).href,
        type: getMimeType(destination),
        size: stats.size,
        lastModified: stats.mtime.getTime(),
      };
    } catch {
      return null;
    }
  }
}

export function createFsDriver(options: FsDriverOptions): DiskDriver {
  return new FsDriver(options);
}
