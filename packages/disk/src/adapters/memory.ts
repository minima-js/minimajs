import type { DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileMetadata, FileSource } from "../types.js";
import { DiskFile } from "../file.js";
import { resolveContentType, resolveKey, toBuffer } from "../helpers.js";

interface StoredFile {
  data: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface MemoryDriverOptions {
  /** Base URL for generating public URLs */
  publicUrl?: string;
}

/**
 * In-memory storage driver for testing
 */
export function createMemoryDriver(options: MemoryDriverOptions = {}): DiskDriver & { clear(): void } {
  const storage = new Map<string, StoredFile>();

  return {
    name: "memory",

    async put(key: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile> {
      const buffer = await toBuffer(data);
      const contentType = resolveContentType(data, putOptions);

      storage.set(key, {
        data: buffer,
        contentType,
        metadata: putOptions?.metadata,
        createdAt: new Date(),
      });

      return new DiskFile(key.split("/").pop() || key, {
        key,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${key}` : undefined,
        size: buffer.length,
        mimeType: contentType,
        metadata: putOptions?.metadata,
        stream: () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(buffer));
              controller.close();
            },
          }),
      });
    },

    async get(key: string): Promise<DiskFile | null> {
      const stored = storage.get(key);
      if (!stored) return null;

      return new DiskFile(key.split("/").pop() || key, {
        key,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${key}` : undefined,
        size: stored.data.length,
        mimeType: stored.contentType,
        metadata: stored.metadata,
        stream: () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(stored.data));
              controller.close();
            },
          }),
      });
    },

    async delete(key: string): Promise<void> {
      storage.delete(key);
    },

    async exists(key: string): Promise<boolean> {
      return storage.has(key);
    },

    async url(key: string, _urlOptions?: UrlOptions): Promise<string> {
      if (!options.publicUrl) {
        throw new Error("publicUrl is required to generate a url");
      }
      return `${options.publicUrl.replace(/\/$/, "")}/${key}`;
    },

    async copy(from: FileSource, to: string): Promise<DiskFile> {
      const fromKey = resolveKey(from);
      const stored = storage.get(fromKey);
      if (!stored) {
        throw new Error(`File not found: ${fromKey}`);
      }

      storage.set(to, { ...stored, createdAt: new Date() });

      return new DiskFile(to.split("/").pop() || to, {
        key: to,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${to}` : undefined,
        size: stored.data.length,
        mimeType: stored.contentType,
        metadata: stored.metadata,
        stream: () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(stored.data));
              controller.close();
            },
          }),
      });
    },

    async move(from: FileSource, to: string): Promise<DiskFile> {
      const fromKey = resolveKey(from);
      const stored = storage.get(fromKey);
      if (!stored) {
        throw new Error(`File not found: ${fromKey}`);
      }

      storage.delete(fromKey);
      storage.set(to, stored);

      return new DiskFile(to.split("/").pop() || to, {
        key: to,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${to}` : undefined,
        size: stored.data.length,
        mimeType: stored.contentType,
        metadata: stored.metadata,
        stream: () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(stored.data));
              controller.close();
            },
          }),
      });
    },

    async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
      const limit = listOptions?.limit;
      let count = 0;

      for (const [key, stored] of storage.entries()) {
        if (limit !== undefined && count >= limit) break;
        if (prefix && !key.startsWith(prefix)) continue;

        yield new DiskFile(key.split("/").pop() || key, {
          key,
          url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${key}` : undefined,
          size: stored.data.length,
          mimeType: stored.contentType,
          metadata: stored.metadata,
          stream: () =>
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(stored.data));
                controller.close();
              },
            }),
        });
        count++;
      }
    },

    async getMetadata(key: string): Promise<FileMetadata | null> {
      const stored = storage.get(key);
      if (!stored) return null;

      return {
        key,
        size: stored.data.length,
        contentType: stored.contentType,
        lastModified: stored.createdAt,
        metadata: stored.metadata,
      };
    },

    /** Clear all stored files (useful for test cleanup) */
    clear(): void {
      storage.clear();
    },
  };
}
