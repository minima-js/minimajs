import { createHash } from "node:crypto";
import type { Disk } from "../../types.js";
import { DiskError } from "../../errors.js";
import { text2stream } from "../../helpers.js";

export class ChecksumMismatchError extends DiskError {
  readonly name = "ChecksumMismatchError";
  constructor(
    public readonly path: string,
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(`Checksum mismatch for "${path}": expected ${expected}, got ${actual}`);
  }
}

export interface ChecksumOptions {
  /**
   * Hash algorithm passed to node:crypto createHash
   * @default 'sha256'
   */
  algorithm?: string;
  /**
   * File extension appended to the href for the sidecar file
   * @default '.sha256'
   */
  extension?: string;
}

/**
 * Checksum plugin — writes a sidecar hash file alongside each stored file
 * and verifies integrity on stream read.
 *
 * Calls driver methods directly (bypassing hooks) so the sidecar file is
 * invisible to other plugins and cannot trigger recursive verification.
 *
 * @example
 * const disk = createDisk({ driver }, checksum())
 * await disk.put('data.json', content)    // writes data.json + data.json.sha256
 * const file = await disk.get('data.json') // stream verified on read
 */
export function checksum(options: ChecksumOptions = {}) {
  const { algorithm = "sha256", extension = ".sha256" } = options;
  return (disk: Disk) => {
    disk.hook("storing", (path, stream) => {
      const hash = createHash(algorithm);
      return stream.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            hash.update(chunk);
            controller.enqueue(chunk);
          },
          async flush() {
            const digest = hash.digest("hex");
            await disk.driver.put(`${path}${extension}`, text2stream(digest), {});
          },
        })
      );
    });

    // Wrap the stream with an incremental hash verifier. Reads the sidecar
    // directly via driver so other plugins don't see it.
    disk.hook("streaming", async (stream, file) => {
      const result = await disk.driver.get(`${file.href}${extension}`);
      if (!result) return;

      const [sidecarStream] = result;
      const chunks: Uint8Array[] = [];
      const reader = sidecarStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      const total = chunks.reduce((s, c) => s + c.length, 0);
      const combined = new Uint8Array(total);
      let pos = 0;
      for (const c of chunks) {
        combined.set(c, pos);
        pos += c.length;
      }
      const expected = new TextDecoder().decode(combined).trim();

      const hash = createHash(algorithm);
      const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          hash.update(chunk);
          controller.enqueue(chunk);
        },
        flush(controller) {
          const actual = hash.digest("hex");
          if (actual !== expected) {
            controller.error(new ChecksumMismatchError(file.href, expected, actual));
          }
        },
      });

      return stream.pipeThrough(transform);
    });

    // Delete the sidecar when the original file is deleted.
    disk.hook("deleted", async (path) => {
      if (path.endsWith(extension)) return;
      await disk.driver.delete(`${path}${extension}`).catch(() => {});
    });
  };
}
