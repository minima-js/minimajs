import type { CompressionFormat } from "stream/web";
import type { Disk } from "../../types.js";

// CompressionFormat is a DOM type not available in ESNext lib
// type CompressionFormat = "gzip" | "deflate" | "deflate-raw";

export interface CompressionOptions {
  /** Compression algorithm (default: 'gzip') */
  algorithm?: CompressionFormat;
  /** Store compression algorithm in metadata to enable auto-decompression on read (default: true) */
  storeMetadata?: boolean;
}

const METADATA_KEY = "x-compression";

/**
 * Compression plugin — compresses files on put, decompresses on get.
 *
 * Uses the Web API CompressionStream/DecompressionStream (Node 18+, all modern browsers).
 * The algorithm is stored in file metadata so decompression is automatic on read.
 *
 * @example
 * const disk = createDisk({ driver }, compression())
 * await disk.put('file.txt', data)  // stored compressed
 * const file = await disk.get('file.txt')  // transparently decompressed
 *
 * @example
 * // Custom algorithm
 * const disk = createDisk({ driver }, compression({ algorithm: 'deflate-raw' }))
 */
export function compression(options: CompressionOptions = {}) {
  const { algorithm = "gzip", storeMetadata = true } = options;
  return (disk: Disk) => {
    disk.hook("storing", (stream, putOptions) => {
      if (storeMetadata) {
        putOptions.metadata ??= {};
        putOptions.metadata[METADATA_KEY] = algorithm;
      }
      return stream.pipeThrough(new CompressionStream(algorithm) as unknown as TransformStream<Uint8Array, Uint8Array>);
    });

    disk.hook("streaming", (stream, file) => {
      const algo = file.metadata?.[METADATA_KEY] as CompressionFormat | undefined;
      if (!algo) return;
      return stream.pipeThrough(new DecompressionStream(algo) as unknown as TransformStream<Uint8Array, Uint8Array>);
    });
  };
}
