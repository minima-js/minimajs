import type { DiskDriver } from "@minimajs/disk";
import { type S3DriverOptions, S3Driver } from "./s3-driver.js";

export * from "./s3-driver.js";

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
export function createS3Driver(options: S3DriverOptions): DiskDriver {
  return new S3Driver(options);
}
