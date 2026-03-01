import type { Disk } from "../../types.js";

export interface DownloadProgress {
  loaded: number;
  total?: number;
  percentage?: number;
}

/**
 * Download progress plugin — tracks bytes read from the driver.
 * Uses the `streaming` hook to wrap the stream with a TransformStream
 * that calls `onProgress` as each chunk passes through.
 */
export function downloadProgress(onProgress: (progress: DownloadProgress) => void) {
  return (disk: Disk) => {
    disk.hook("streaming", (stream, file) => {
      const total = file.size || undefined;
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
