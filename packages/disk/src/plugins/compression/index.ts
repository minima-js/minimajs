import type { CompressionFormat } from "stream/web";
import type { Disk } from "../../types.js";
import type { DiskFile } from "../../file.js";

// CompressionFormat is a DOM type not available in ESNext lib
// type CompressionFormat = "gzip" | "deflate" | "deflate-raw";

export interface CompressionOptions {
  /** Compression algorithm (default: 'gzip') */
  algorithm?: CompressionFormat;
}

const METADATA_KEY = "x-compression";

/**
 * Compression plugin — compresses files on put, decompresses on get.
 *
 * Uses the Web API CompressionStream/DecompressionStream (Node 18+, all modern browsers).
 *
 * **Behavior depends on driver metadata support (`capabilities.metadata`):**
 * - `true`  — algorithm is stored per-file in metadata; mixed compressed/uncompressed
 *             files are safe, and the correct algorithm is always used on read.
 * - `false` or absent — algorithm is NOT stored; every file read through this disk
 *             is assumed to be compressed with the configured algorithm.
 *             Do not mix compressed and uncompressed files on the same disk.
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
  const { algorithm = "gzip" } = options;
  return (disk: Disk) => {
    function getAlgo(file: DiskFile): CompressionFormat | undefined {
      if (!disk.driver.capabilities?.metadata) {
        return algorithm;
      }
      return file.metadata?.[METADATA_KEY] as CompressionFormat | undefined;
    }

    disk.hook("storing", (_path, stream, putOptions) => {
      if (disk.driver.capabilities?.metadata) {
        putOptions.metadata ??= {};
        putOptions.metadata[METADATA_KEY] = algorithm;
      }
      return stream.pipeThrough(new CompressionStream(algorithm) as unknown as TransformStream<Uint8Array, Uint8Array>);
    });

    disk.hook("streaming", (stream, file) => {
      const algo = getAlgo(file);
      if (!algo) return;
      return stream.pipeThrough(new DecompressionStream(algo) as unknown as TransformStream<Uint8Array, Uint8Array>);
    });
  };
}
