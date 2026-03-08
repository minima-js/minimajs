import type { Disk } from "./types.js";
import { PassThrough, Readable } from "node:stream";
import { Zip, ZipDeflate, Unzip, UnzipInflate } from "fflate";
import type { UnzipFile } from "fflate";

export interface SnapshotOptions {
  /** Source path/prefix to snapshot — omit to snapshot all files */
  path?: string;
  /** Prefix for the snapshot file on the destination disk (default: 'snapshots/') */
  prefix?: string;
  /** AbortSignal to cancel the snapshot operation */
  signal?: AbortSignal;
}

export interface RestoreOptions {
  /** Restore files under a different path prefix */
  targetPath?: string;
  /** Overwrite existing files (default: false) */
  overwrite?: boolean;
  /** AbortSignal to cancel the restore operation */
  signal?: AbortSignal;
}

/**
 * Snapshot files from `src` into a single streaming ZIP on `dest`.
 * No files are buffered in memory — data streams directly through the ZIP encoder.
 * Compression, encryption, and other transforms are handled by plugins on `dest`.
 *
 * @example
 * // Simple local → S3 backup
 * const snapshotId = await snapshot(localDisk, s3Disk)
 *
 * // Snapshot a specific path
 * const snapshotId = await snapshot(localDisk, s3Disk, { path: 'uploads/' })
 *
 * // With encryption on dest via plugin
 * const secureDisk = createDisk(s3Driver, encrypt({ password }))
 * const snapshotId = await snapshot(localDisk, secureDisk)
 */
export async function snapshot(src: Disk, dest: Disk, options: SnapshotOptions = {}): Promise<string> {
  const { path: sourcePath, prefix = "snapshots/", signal } = options;
  signal?.throwIfAborted();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFile = `${prefix}${(sourcePath || "all").replace(/[/*]/g, "_")}_${timestamp}.zip`;

  // Bridge fflate's callback API into a Node.js PassThrough → Web ReadableStream
  const passThrough = new PassThrough();
  const webStream = Readable.toWeb(passThrough) as ReadableStream<Uint8Array>;

  const zip = new Zip();
  zip.ondata = (err: Error | null, chunk: Uint8Array, final: boolean) => {
    if (err) {
      passThrough.destroy(err);
      return;
    }
    passThrough.write(chunk);
    if (final) passThrough.end();
  };

  // Abort the passthrough stream when signal fires
  signal?.addEventListener("abort", () => passThrough.destroy(signal.reason ?? new DOMException("Aborted", "AbortError")), {
    once: true,
  });

  // Start the put concurrently — consumes the stream as zip chunks flow in
  const putPromise = dest.put(snapshotFile, webStream, { type: "application/zip" });

  const listPrefix = sourcePath?.replace(/\/$/, "") || undefined;
  for await (const file of src.list(listPrefix, { signal })) {
    const srcFile = await src.get(file.href, { signal });
    if (!srcFile) continue;

    const entry = new ZipDeflate(file.href, { level: 6 });
    zip.add(entry);

    const reader = srcFile.stream().getReader();
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) {
        entry.push(new Uint8Array(0), true);
        break;
      }
      entry.push(value);
    }
  }

  zip.end();
  await putPromise;

  return snapshotFile;
}

/**
 * Restore a snapshot ZIP from `src` into `dest` (defaults to `src` if omitted).
 * The ZIP is streamed — individual files are never fully buffered in memory.
 *
 * @example
 * // Restore to same disk
 * await restore('snapshots/....zip', localDisk)
 *
 * // Restore from S3 backup to local
 * await restore('snapshots/....zip', s3Disk, localDisk)
 *
 * // Restore to a different path
 * await restore('snapshots/....zip', s3Disk, localDisk, { targetPath: 'restored/' })
 */
export async function restore(
  snapshotFile: string,
  src: Disk,
  dest: Disk = src,
  options: RestoreOptions = {}
): Promise<void> {
  const { overwrite = false, targetPath, signal } = options;
  signal?.throwIfAborted();

  const file = await src.get(snapshotFile, { signal });
  if (!file) throw new Error(`Snapshot not found: ${snapshotFile}`);

  const entryPromises: Promise<unknown>[] = [];

  const unzip = new Unzip((entry: UnzipFile) => {
    if (entry.name.endsWith("/")) return; // skip directory entries

    const restorePath = targetPath ? `${targetPath}/${entry.name}` : entry.name;

    const passThrough = new PassThrough();
    const webStream = Readable.toWeb(passThrough) as ReadableStream<Uint8Array>;

    const putPromise = overwrite
      ? dest.put(restorePath, webStream)
      : dest.exists(restorePath, { signal }).then((exists) => {
          if (exists) {
            passThrough.end();
            return;
          }
          return dest.put(restorePath, webStream);
        });

    entryPromises.push(putPromise);

    entry.ondata = (err: Error | null, chunk: Uint8Array, final: boolean) => {
      if (err) {
        passThrough.destroy(err);
        return;
      }
      passThrough.write(chunk);
      if (final) passThrough.end();
    };
    entry.start();
  });

  unzip.register(UnzipInflate);

  const reader = file.stream().getReader();
  while (true) {
    signal?.throwIfAborted();
    const { done, value } = await reader.read();
    if (done) {
      unzip.push(new Uint8Array(0), true);
      break;
    }
    unzip.push(value);
  }

  await Promise.all(entryPromises);
}
