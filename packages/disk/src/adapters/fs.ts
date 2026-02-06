import { mkdir, rm, stat, writeFile, access } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { DiskDriver, DiskData, PutOptions, UrlOptions } from "../types.js";
import { DiskFile } from "../file.js";
import { resolveContentType, sanitizeKey, toBuffer } from "../helpers.js";

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
  } satisfies DiskDriver;
}
