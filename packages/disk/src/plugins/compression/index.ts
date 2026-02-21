import { createGzip, createGunzip, type ZlibOptions } from "node:zlib";
import { Readable } from "node:stream";
import type { Disk } from "../../types.js";

/**
 * Compression pipeline - compresses files on put, decompresses on get
 */

export function compression(options: CompressionOptions = {}) {
  const { algorithm = "gzip", storeMetadata = true, ...zlibOptions } = options;

  return (disk: Disk) => {
    // Compress on put
    disk.hook("put", async (ctx) => {
      if (!ctx.stream) return;

      const nodeInput = Readable.fromWeb(ctx.stream);
      const compressor = createGzip(zlibOptions);
      const compressed = nodeInput.pipe(compressor);

      if (storeMetadata && ctx.options.metadata) {
        ctx.options.metadata["x-compression"] = algorithm;
      }

      return Readable.toWeb(compressed);
    });

    // Decompress on retrieved
    disk.hook("retrieved", async (file) => {
      if (!file) return;

      const isCompressed = compressedFiles.has(file.href) || (file.metadata && file.metadata["x-compression"] === algorithm);

      if (!isCompressed) return file;

      // Create new DiskFile with decompressed stream
      const originalStream = file.stream.bind(file);
      const newFile = Object.create(file);
      newFile.stream = async () => {
        const stream = await originalStream();
        const nodeInput = webToNode(stream);
        const decompressor = createGunzip();
        const decompressed = nodeInput.pipe(decompressor);
        return nodeToWeb(decompressed);
      };

      return newFile;
    });
  };
} /**
 * Compression pipeline options
 */

export interface CompressionOptions extends ZlibOptions {
  /** Compression algorithm (default: 'gzip') */
  algorithm?: "gzip" | "deflate";
  /** Store compression metadata (default: true) */
  storeMetadata?: boolean;
}
