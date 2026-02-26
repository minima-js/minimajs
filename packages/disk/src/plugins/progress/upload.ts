import type { Disk } from "../../types.js";

export interface UploadProgress {
  loaded: number;
  total?: number;
  percentage?: number;
}

/**
 * Upload progress plugin — tracks bytes written to the driver.
 * Uses the `storing` hook to wrap the stream with a TransformStream
 * that calls `onProgress` as each chunk passes through.
 */
export function uploadProgress(onProgress: (progress: UploadProgress) => void) {
  return (disk: Disk) => {
    disk.hook("storing", (_path, stream, options) => {
      const total = options.size;
      let loaded = 0;

      const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          loaded += chunk.length;
          onProgress({
            loaded,
            total,
            percentage: total ? (loaded / total) * 100 : undefined,
          });
          controller.enqueue(chunk);
        },
      });

      return stream.pipeThrough(transform);
    });
  };
}
