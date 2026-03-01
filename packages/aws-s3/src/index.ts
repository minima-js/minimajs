/**
 * AWS S3 storage driver for `@minimajs/disk`.
 *
 * Interact with S3 using web-native File APIs — no need to learn the AWS SDK.
 * Supports plain paths, `s3://bucket/key` URIs, and public CDN URLs as file references.
 *
 * @example
 * ```typescript
 * import { createS3Driver } from '@minimajs/aws-s3';
 * import { createDisk } from '@minimajs/disk';
 *
 * const disk = createDisk({
 *   driver: createS3Driver({
 *     bucket: 'my-bucket',
 *     region: 'us-east-1',
 *     credentials: {
 *       accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *     },
 *     publicUrl: 'https://d1234.cloudfront.net', // optional CDN
 *   }),
 * });
 *
 * await disk.put('uploads/photo.jpg', imageBuffer);
 * const file = await disk.get('uploads/photo.jpg');
 * const blob = await file.blob();
 * ```
 *
 * @packageDocumentation
 */
import type { DiskDriver } from "@minimajs/disk";
import { type S3BaseDriverOptions, S3Driver } from "./s3-driver.js";
import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";

export * from "./s3-driver.js";
/**@internal */
export interface S3DriverOptions extends S3BaseDriverOptions, S3ClientConfig {
  defaultsMode?: S3ClientConfig["defaultsMode"];
}

/**
 * Create an S3 storage driver for @minimajs/disk
 *
 * Use web-native File APIs to interact with AWS S3—no need to learn the AWS SDK.
 *
 * @example
 * ```typescript
 * import { createS3Driver } from '@minimajs/aws-s3';
 * import { createDisk } from '@minimajs/disk';
 *
 * const s3Driver = createS3Driver({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   },
 *   publicUrl: 'https://d1234.cloudfront.net', // optional CloudFront URL
 * });
 *
 * const disk = createDisk({ driver: s3Driver });
 *
 * // Use web-native APIs - no AWS SDK needed!
 * await disk.put('uploads/photo.jpg', imageBuffer);
 * const file = await disk.get('uploads/photo.jpg');
 * const blob = await file.blob(); // Standard File API
 * ```
 */
export function createS3Driver(options: S3DriverOptions): DiskDriver;
export function createS3Driver(client: S3Client, options: S3BaseDriverOptions): DiskDriver;
export function createS3Driver(clientOrOptions: S3Client | S3DriverOptions, options?: S3BaseDriverOptions): DiskDriver {
  if (clientOrOptions instanceof S3Client) {
    return new S3Driver(clientOrOptions, options!);
  }
  const client = new S3Client(clientOrOptions);
  return new S3Driver(client, clientOrOptions);
}
