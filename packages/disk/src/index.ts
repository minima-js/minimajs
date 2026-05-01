/**
 * Provider-agnostic storage abstraction for `@minimajs/server`.
 *
 * Interact with the filesystem, AWS S3, Azure Blob, and any custom storage backend
 * using a consistent web-native File API — no SDK-specific knowledge required.
 *
 * Supports single-driver disks via `createDisk`, multi-protocol routing via
 * `createProtoDisk`, and short-lived temp storage via `createTempDisk`.
 * Extend behavior with composable plugins (compression, encryption, atomic writes, etc.).
 *
 * @example
 * ```typescript
 * import { createDisk } from '@minimajs/disk';
 * import { createS3Driver } from '@minimajs/aws-s3';
 *
 * const disk = createDisk({ driver: createS3Driver({ bucket: 'my-bucket', region: 'us-east-1' }) });
 *
 * await disk.put('avatar.jpg', imageBuffer);
 * const file = await disk.get('avatar.jpg');
 * const blob = await file.blob();
 * ```
 *
 * @packageDocumentation
 * @module @minimajs/disk
 */
import { FsDriver } from "./adapters/fs.js";
import { createFsDriver } from "./adapters/index.js";
import { StandardDisk } from "./standard-disk.js";
import { ProtoDisk } from "./proto-disk.js";
import type { DiskDriver, Disk, ProtoDiskOptions } from "./types.js";
import type { DiskHooks } from "./hooks/types.js";
import { tmpdir } from "node:os";

// Core types and utilities
export * from "./types.js";
export * from "./file.js";
export * from "./symbols.js";
export * from "./errors.js";
export * from "./hooks/manager.js";
export * from "./hooks/types.js";
export * from "./hooks/trigger.js";

// Errors
export * from "./errors.js";

// Disk implementations
export * from "./standard-disk.js";
export * from "./proto-disk.js";

// Plugins
export interface CreateDiskOptions<TDriver extends DiskDriver = DiskDriver> {
  driver?: TDriver;
  hooks?: Partial<DiskHooks>;
}

/** A plugin is a function that receives a Disk and registers hooks on it */
export type DiskPlugin = (disk: Disk) => void;

/**
 * Create a Disk instance with web-native File APIs for any storage provider
 *
 * Interact with filesystem, S3, Azure Blob, and more using consistent web-native APIs.
 * Forget the inconsistency of dealing with multiple providers using different SDKs.
 *
 * @example
 * ```typescript
 * import { createDisk } from '@minimajs/disk';
 * import { createFsDriver } from '@minimajs/disk/adapters';
 * import { createS3Driver } from '@minimajs/aws-s3';
 *
 * // Filesystem storage
 * const localDisk = createDisk({
 *   driver: createFsDriver({ root: './uploads' })
 * });
 *
 * // S3 storage - same API!
 * const s3Disk = createDisk({
 *   driver: createS3Driver({
 *     bucket: 'my-bucket',
 *     region: 'us-east-1',
 *   })
 * });
 *
 * // Default filesystem driver (uses current working directory)
 * const disk = createDisk();
 *
 * // With plugins — passed as rest arguments, applied in order
 * const disk = createDisk(
 *   { driver: createFsDriver({ root: './uploads' }) },
 *   compression(),
 *   atomicWrite(),
 *   encrypt({ password: process.env.SECRET })
 * );
 *
 * // Web-native File API - works everywhere
 * await disk.put('avatar.jpg', imageBuffer);
 * const file = await disk.get('avatar.jpg');
 * const blob = await file.blob(); // Standard File.blob()
 * const text = await file.text(); // Standard File.text()
 *
 * // Upload File objects directly
 * const uploadedFile = new File(['content'], 'doc.txt');
 * await disk.put(uploadedFile); // Preserves original filename by default
 * ```
 */
export function createDisk<TDriver extends DiskDriver = FsDriver>(
  options: CreateDiskOptions<TDriver> = {},
  ...plugins: DiskPlugin[]
): Disk<TDriver> {
  const driver = (options.driver ?? createFsDriver()) as TDriver;
  const disk = new StandardDisk(driver, { hooks: options.hooks });
  for (const plugin of plugins) plugin(disk);
  return disk;
}

/**
 * Create a ProtoDisk instance that routes to different storage providers by URL prefix
 *
 * Route operations to different drivers based on URL prefixes while using the same
 * web-native File API. Perfect for multi-cloud architectures or migrating between providers.
 *
 * Supports granular routing by matching longest prefix first:
 * - Protocol-only: 'file://', 's3://', 'https://'
 * - Bucket-specific: 's3://images-bucket/', 's3://videos-bucket/'
 * - Domain-specific: 'https://cdn1.example.com/', 'https://cdn2.example.com/'
 *
 * @example
 * ```typescript
 * import { createProtoDisk } from '@minimajs/disk';
 * import { createFsDriver } from '@minimajs/disk/adapters';
 * import { createS3Driver } from '@minimajs/aws-s3';
 * import { createAzureBlobDriver } from '@minimajs/azure-blob';
 *
 * const disk = createProtoDisk({
 *   protocols: {
 *     'file://': createFsDriver({ root: './uploads' }),
 *     's3://images/': createS3Driver({ bucket: 'images', region: 'us-east-1' }),
 *     's3://videos/': createS3Driver({ bucket: 'videos', region: 'us-west-2' }),
 *     'https://cdn.example.com/': createAzureBlobDriver({
 *       connectionString: process.env.AZURE_CONNECTION!,
 *       container: 'cdn',
 *     }),
 *   },
 *   defaultProtocol: 'file://',
 * });
 *
 * // Routes to filesystem
 * await disk.put('file://temp/draft.txt', 'Draft content');
 *
 * // Routes to S3 images bucket
 * await disk.put('s3://images/avatar.jpg', imageBuffer);
 *
 * // Routes to S3 videos bucket
 * await disk.put('s3://videos/intro.mp4', videoBuffer);
 *
 * // Routes to Azure Blob via CDN URL
 * await disk.put('https://cdn.example.com/static/logo.png', logoBuffer);
 *
 * // Cross-storage copy - S3 to Azure!
 * await disk.copy('s3://images/file.jpg', 'https://cdn.example.com/backup/file.jpg');
 *
 * // Same web-native API everywhere
 * const file = await disk.get('s3://images/avatar.jpg');
 * const blob = await file.blob(); // Standard File.blob()
 * ```
 */
export function createProtoDisk(options: ProtoDiskOptions, ...plugins: DiskPlugin[]) {
  const disk = new ProtoDisk(options);
  for (const plugin of plugins) plugin(disk);
  return disk;
}

/**
 * Create a temporary disk backed by the OS temp directory.
 *
 * Useful for short-lived file operations (e.g., processing uploads before
 * moving them to permanent storage). Files are stored under `os.tmpdir()`
 * and are not automatically cleaned up — delete them when done.
 *
 * @param plugins - Optional disk plugins to apply (e.g., compression, encryption)
 * @returns A `StandardDisk` instance rooted at the system temp directory
 *
 * @example
 * ```typescript
 * import { createTempDisk } from "@minimajs/disk";
 *
 * const tmp = createTempDisk();
 *
 * const file = await tmp.put("upload.jpg", imageStream);
 * // process file...
 * await tmp.delete(file);
 * ```
 */
export function createTempDisk(...plugins: DiskPlugin[]) {
  const disk = new StandardDisk(new FsDriver({ root: "file://" + tmpdir() + "/" }), {});
  for (const plugin of plugins) plugin(disk);
  return disk;
}
