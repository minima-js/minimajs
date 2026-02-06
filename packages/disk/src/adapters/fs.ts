import { mkdir, rm, stat, writeFile, access, copyFile, rename, readdir } from "node:fs/promises";
import { basename, dirname, resolve, join, relative } from "node:path";
import type { DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileMetadata, FileSource } from "../types.js";
import { DiskFile } from "../file.js";
import { resolveContentType, resolveKey, sanitizeKey, toBuffer } from "../helpers.js";

export interface FsDriverOptions {
  /** Root directory for file storage */
  root: string;
  /** Base URL for public file access */
  publicUrl?: string;
}

export function createFsDriver(options: FsDriverOptions): DiskDriver {
  const root = resolve(options.root);

  return {
    name: "fs",

    async put(key: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile> {
      const safeKey = sanitizeKey(key);
      const destination = resolve(root, safeKey);
      const filename = basename(safeKey);

      await mkdir(dirname(destination), { recursive: true });
      const buffer = await toBuffer(data);
      await writeFile(destination, buffer);

      return new DiskFile(filename, {
        key: safeKey,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${safeKey}` : undefined,
        size: buffer.length,
        mimeType: resolveContentType(data, putOptions),
        metadata: putOptions?.metadata,
        path: destination,
      });
    },

    async get(key: string): Promise<DiskFile | null> {
      const safeKey = sanitizeKey(key);
      const filepath = resolve(root, safeKey);

      try {
        const stats = await stat(filepath);
        return new DiskFile(basename(safeKey), {
          key: safeKey,
          size: stats.size,
          path: filepath,
        });
      } catch {
        return null;
      }
    },

    async delete(key: string): Promise<void> {
      const safeKey = sanitizeKey(key);
      const filepath = resolve(root, safeKey);
      await rm(filepath, { force: true });
    },

    async exists(key: string): Promise<boolean> {
      const safeKey = sanitizeKey(key);
      const filepath = resolve(root, safeKey);
      try {
        await access(filepath);
        return true;
      } catch {
        return false;
      }
    },

    async url(key: string, _urlOptions?: UrlOptions): Promise<string> {
      if (!options.publicUrl) {
        throw new Error("publicUrl is required to generate a url");
      }
      const safeKey = sanitizeKey(key);
      return `${options.publicUrl.replace(/\/$/, "")}/${safeKey}`;
    },

    async copy(from: FileSource, to: string): Promise<DiskFile> {
      const safeFrom = sanitizeKey(resolveKey(from));
      const safeTo = sanitizeKey(to);
      const srcPath = resolve(root, safeFrom);
      const destPath = resolve(root, safeTo);

      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(srcPath, destPath);

      const stats = await stat(destPath);
      return new DiskFile(basename(safeTo), {
        key: safeTo,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${safeTo}` : undefined,
        size: stats.size,
        path: destPath,
      });
    },

    async move(from: FileSource, to: string): Promise<DiskFile> {
      const safeFrom = sanitizeKey(resolveKey(from));
      const safeTo = sanitizeKey(to);
      const srcPath = resolve(root, safeFrom);
      const destPath = resolve(root, safeTo);

      await mkdir(dirname(destPath), { recursive: true });
      await rename(srcPath, destPath);

      const stats = await stat(destPath);
      return new DiskFile(basename(safeTo), {
        key: safeTo,
        url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${safeTo}` : undefined,
        size: stats.size,
        path: destPath,
      });
    },

    async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
      const safePrefix = prefix ? sanitizeKey(prefix) : "";
      const searchDir = safePrefix ? resolve(root, safePrefix) : root;
      const recursive = listOptions?.recursive ?? true;
      let count = 0;
      const limit = listOptions?.limit;

      async function* walkDir(dir: string): AsyncGenerator<DiskFile> {
        let entries;
        try {
          entries = await readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (limit !== undefined && count >= limit) return;

          const fullPath = join(dir, entry.name);
          const key = relative(root, fullPath);

          if (entry.isFile()) {
            const stats = await stat(fullPath);
            yield new DiskFile(entry.name, {
              key,
              size: stats.size,
              path: fullPath,
              url: options.publicUrl ? `${options.publicUrl.replace(/\/$/, "")}/${key}` : undefined,
            });
            count++;
          } else if (entry.isDirectory() && recursive) {
            yield* walkDir(fullPath);
          }
        }
      }

      yield* walkDir(searchDir);
    },

    async getMetadata(key: string): Promise<FileMetadata | null> {
      const safeKey = sanitizeKey(key);
      const filepath = resolve(root, safeKey);

      try {
        const stats = await stat(filepath);
        return {
          key: safeKey,
          size: stats.size,
          lastModified: stats.mtime,
        };
      } catch {
        return null;
      }
    },
  } satisfies DiskDriver;
}
