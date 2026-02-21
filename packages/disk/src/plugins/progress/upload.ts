import type { Disk } from "../../types.js";

/**
 * Upload progress pipeline - tracks upload progress
 */

export function uploadProgress(onProgress: (progress: { loaded: number; total?: number; percentage?: number }) => void) {
  return (disk: Disk) => {
    disk.hook("put", async (ctx) => {
      if (!ctx.stream) return;

      let loaded = 0;
      const total = ctx.options.type ? undefined : undefined; // We don't know total from stream

      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = ctx.stream!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              loaded += value.length;
              onProgress({
                loaded,
                total,
                percentage: total ? (loaded / total) * 100 : undefined,
              });

              controller.enqueue(value);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
    });
  };
}
