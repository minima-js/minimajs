import { DiskFileNotFoundError } from "../errors.js";
import type { DiskDriver, DriverCapabilities, PutOptions, UrlOptions, ListOptions, FileMetadata } from "../types.js";

interface StoredFile {
  data: Buffer;
  type: string;
  lastModified: number;
  metadata?: Record<string, string>;
}

export interface MemoryDriverOptions {
  /** Base URL for generating public URLs */
  publicUrl?: string;
}

/**
 * In-memory storage driver for testing and development
 * Data is stored in memory and will be lost when the process exits
 */
class MemoryDriver implements DiskDriver {
  readonly name = "memory";
  readonly capabilities: DriverCapabilities = { metadata: true };
  private readonly storage = new Map<string, StoredFile>();
  private readonly publicUrl?: string;

  constructor(options: MemoryDriverOptions = {}) {
    this.publicUrl = options.publicUrl;
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions?: PutOptions): Promise<FileMetadata> {
    // Read stream into buffer
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    const type = putOptions?.type || "application/octet-stream";
    const now = Date.now();

    this.storage.set(href, {
      data: buffer,
      type,
      lastModified: now,
      metadata: putOptions?.metadata,
    });

    return {
      href,
      size: buffer.length,
      type,
      lastModified: now,
      metadata: putOptions?.metadata,
    };
  }

  async get(href: string, options: { signal?: AbortSignal }): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    options.signal?.throwIfAborted();
    const stored = this.storage.get(href);
    if (!stored) return null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(stored.data));
        controller.close();
      },
    });

    const metadata: FileMetadata = {
      href,
      size: stored.data.length,
      type: stored.type,
      lastModified: stored.lastModified,
      metadata: stored.metadata,
    };

    return [stream, metadata];
  }

  async delete(href: string, options: { signal?: AbortSignal }): Promise<void> {
    options.signal?.throwIfAborted();
    this.storage.delete(href);
  }

  async exists(href: string, options: { signal?: AbortSignal }): Promise<boolean> {
    options.signal?.throwIfAborted();
    return this.storage.has(href);
  }

  async url(href: string, _urlOptions?: UrlOptions): Promise<string> {
    if (!this.publicUrl) {
      throw new Error("publicUrl is required to generate URLs");
    }
    // For memory driver, just return publicUrl + href
    return `${this.publicUrl.replace(/\/$/, "")}/${href.replace(/^\//, "")}`;
  }

  async copy(from: string, to: string, options: { signal?: AbortSignal }): Promise<void> {
    options.signal?.throwIfAborted();
    const stored = this.storage.get(from);
    if (!stored) throw new DiskFileNotFoundError(from);

    // Copy with new lastModified
    this.storage.set(to, {
      ...stored,
      lastModified: Date.now(),
    });
  }

  async move(from: string, to: string, options: { signal?: AbortSignal }): Promise<void> {
    options.signal?.throwIfAborted();
    const stored = this.storage.get(from);
    if (!stored) throw new DiskFileNotFoundError(from);

    this.storage.delete(from);
    this.storage.set(to, stored);
  }

  async *list(prefix?: string, listOptions: ListOptions = {}): AsyncIterable<FileMetadata> {
    const limit = listOptions?.limit;
    let count = 0;

    for (const [href, stored] of this.storage.entries()) {
      if (limit !== undefined && count >= limit) break;
      listOptions.signal?.throwIfAborted();
      if (prefix && !href.startsWith(prefix)) continue;

      yield {
        href,
        size: stored.data.length,
        type: stored.type,
        lastModified: stored.lastModified,
        metadata: stored.metadata,
      };

      count++;
    }
  }

  async metadata(href: string, options: { signal?: AbortSignal }): Promise<FileMetadata | null> {
    options.signal?.throwIfAborted();
    const stored = this.storage.get(href);
    if (!stored) return null;

    return {
      href,
      size: stored.data.length,
      type: stored.type,
      lastModified: stored.lastModified,
      metadata: stored.metadata,
    };
  }

  /** Clear all stored files (useful for test cleanup) */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Create an in-memory storage driver
 * Useful for testing and development without actual file I/O
 *
 * @example
 * ```typescript
 * import { createMemoryDriver } from '@minimajs/disk';
 *
 * const memoryDriver = createMemoryDriver();
 * const disk = createDisk({ driver: memoryDriver });
 *
 * // Use like any other disk
 * await disk.put('test.txt', 'Hello World');
 *
 * // Clear all data (useful in test cleanup)
 * memoryDriver.clear();
 * ```
 */
export function createMemoryDriver(options: MemoryDriverOptions = {}): DiskDriver & { clear(): void } {
  return new MemoryDriver(options);
}
