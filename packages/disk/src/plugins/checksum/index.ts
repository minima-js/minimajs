import { createHash } from "node:crypto";
import type { Disk } from "../../types.js";
import { DiskFile } from "../../file.js";

export class ChecksumMismatchError extends Error {
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
   * File extension appended to the original path for the sidecar file
   * @default '.sha256'
   */
  extension?: string;
}

/**
 * Checksum plugin — writes a sidecar hash file alongside each stored file
 * and verifies the integrity of files on read.
 *
 * On `put`: computes the hash of the stored bytes and writes `<path><ext>` next to it.
 * On `get`: reads the sidecar file and wraps the stream in a TransformStream that
 *   verifies the hash at the end of the stream, throwing `ChecksumMismatchError` on corruption.
 * On `delete`: removes the sidecar file along with the original.
 *
 * @example
 * const disk = createDisk({ driver }, checksum())
 * await disk.put('data.json', content)   // writes data.json + data.json.sha256
 * const file = await disk.get('data.json') // verified on stream read
 *
 * @example
 * // Custom algorithm
 * const disk = createDisk({ driver }, checksum({ algorithm: 'sha512', extension: '.sha512' }))
 */
export function checksum(options: ChecksumOptions = {}) {
  const { algorithm = "sha256", extension = ".sha256" } = options;

  return (disk: Disk) => {
    // Paths currently being written (sidecar paths excluded)
    const pendingWrites = new Set<string>();
    // Paths currently being read (sidecar paths excluded)
    const pendingReads = new Set<string>();

    // ── pre-put: track which paths are being written ──────────────────────
    disk.hook("put", (path, data, opts) => {
      if (!path.endsWith(extension)) {
        pendingWrites.add(path);
      }
      return [path, data, opts];
    });

    // ── post-put: compute hash of stored file and write sidecar ───────────
    disk.hook("stored", (file) => {
      const path = [...pendingWrites].find((p) => file.href.endsWith(p));
      if (!path) return;
      pendingWrites.delete(path);

      // Compute hash by consuming the stream (stream() returns a fresh stream each call)
      return (async () => {
        const hash = createHash(algorithm);
        const reader = file.stream().getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          hash.update(value);
        }
        const digest = hash.digest("hex");
        await disk.put(`${path}${extension}`, digest);
        return file;
      })();
    });

    // ── pre-get: track which paths are being read ─────────────────────────
    disk.hook("get", (path) => {
      if (!path.endsWith(extension)) {
        pendingReads.add(path);
      }
      return path;
    });

    // ── post-get: wrap stream to verify hash on read ──────────────────────
    disk.hook("retrieved", (file) => {
      // Skip sidecar files (avoids infinite recursion)
      if (file.href.endsWith(extension)) return;

      const path = [...pendingReads].find((p) => file.href.endsWith(p));
      if (!path) return;
      pendingReads.delete(path);

      const checksumPath = `${path}${extension}`;

      return (async () => {
        const checksumFile = await disk.get(checksumPath);
        if (!checksumFile) return file; // no sidecar = pass through unverified

        const expected = (await checksumFile.text()).trim();
        const originalFile = file;

        // Return a new DiskFile whose stream factory creates a fresh verifying
        // TransformStream each time — safe for multiple stream() calls
        return new DiskFile(file.name, {
          href: file.href,
          size: file.size,
          metadata: file.metadata,
          type: file.type,
          lastModified: file.lastModified,
          stream: () => {
            const hash = createHash(algorithm);
            const transform = new TransformStream<Uint8Array, Uint8Array>({
              transform(chunk, controller) {
                hash.update(chunk);
                controller.enqueue(chunk);
              },
              flush(controller) {
                const actual = hash.digest("hex");
                if (actual !== expected) {
                  controller.error(
                    new ChecksumMismatchError(originalFile.href, expected, actual)
                  );
                }
              },
            });
            return originalFile.stream().pipeThrough(transform);
          },
        });
      })();
    });

    // ── post-delete: remove sidecar when the original is deleted ─────────
    disk.hook("deleted", (path) => {
      if (path.endsWith(extension)) return;
      return disk.delete(`${path}${extension}`).catch(() => {});
    });
  };
}
