import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  type S3ClientConfig,
  type ObjectCannedACL,
  type StorageClass,
  type ServerSideEncryption,
} from "@aws-sdk/client-s3";
import type { DiskDriver, FileMetadata, PutOptions, UrlOptions, ListOptions } from "@minimajs/disk";
import { Readable } from "node:stream";
import { lookup as lookupMimeType } from "mime-types";

export interface S3DriverOptions extends S3ClientConfig {
  /** S3 bucket name (optional if bucket is in the href path) */
  bucket?: string;
  /** AWS region (e.g., 'us-east-1') */
  region: string;
  /** Base prefix/path within the bucket */
  prefix?: string;
  /** Default ACL for uploaded objects */
  acl?: "private" | "public-read" | "public-read-write" | "authenticated-read";
  /** Default storage class */
  storageClass?:
    | "STANDARD"
    | "REDUCED_REDUNDANCY"
    | "STANDARD_IA"
    | "ONEZONE_IA"
    | "INTELLIGENT_TIERING"
    | "GLACIER"
    | "DEEP_ARCHIVE"
    | "GLACIER_IR";
  /** Default server-side encryption */
  serverSideEncryption?: "AES256" | "aws:kms";
}

/**
 * Create an S3 storage driver for use with @minimajs/disk
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
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 *   }
 * });
 *
 * const disk = createDisk({ driver: s3Driver });
 * ```
 */
export function createS3Driver(options: S3DriverOptions): DiskDriver {
  return new S3Driver(options);
}

class S3Driver implements DiskDriver {
  readonly name = "s3";

  private readonly client: S3Client;
  private readonly bucket?: string;
  private readonly region: string;
  private readonly prefix: string;
  private readonly acl?: ObjectCannedACL;
  private readonly storageClass?: StorageClass;
  private readonly serverSideEncryption?: ServerSideEncryption;

  constructor(options: S3DriverOptions) {
    const { bucket, region, prefix = "", acl, storageClass, serverSideEncryption, ...s3Config } = options;

    this.bucket = bucket;
    this.region = region;
    this.prefix = prefix;
    this.acl = acl;
    this.storageClass = storageClass;
    this.serverSideEncryption = serverSideEncryption;
    this.client = new S3Client({ region, ...s3Config });
  }

  /**
   * Extract bucket and S3 key from href
   * Supports:
   * - s3://bucket/key (when bucket is not in constructor)
   * - key (when bucket is in constructor)
   */
  private hrefToKey(href: string): { bucket: string; key: string } {
    let bucket: string;
    let key: string;

    // Handle s3:// protocol
    if (href.startsWith("s3://")) {
      try {
        const url = new URL(href);
        bucket = url.hostname;
        key = url.pathname.slice(1);

        if (!key) {
          throw new Error("S3 key cannot be empty");
        }
      } catch (error) {
        throw new Error(`Invalid S3 href format: ${href}`);
      }
    }
    // Handle plain paths (only when bucket is configured)
    else {
      if (!this.bucket) {
        throw new Error(`Bucket must be specified in driver config or use s3:// protocol. Received: ${href}`);
      }
      bucket = this.bucket;
      // Remove leading slash if present
      key = href.startsWith("/") ? href.slice(1) : href;

      if (!key) {
        throw new Error("S3 key cannot be empty");
      }
    }

    return { bucket, key };
  } /**
   * Build full S3 key with prefix
   */
  private buildKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}`.replace(/\/+/g, "/") : key;
  }

  /**
   * Build href from bucket and S3 key
   */
  private keyToHref(bucket: string, key: string): string {
    return `s3://${bucket}/${key}`;
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions?: PutOptions): Promise<FileMetadata> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    // Convert ReadableStream to Node.js Readable
    const nodeStream = Readable.fromWeb(stream);

    // Prepare metadata
    const metadata: Record<string, string> = {};
    if (putOptions?.metadata) {
      Object.assign(metadata, putOptions.metadata);
    }

    // Upload using PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: nodeStream,
      ContentType: putOptions?.type || lookupMimeType(key) || "application/octet-stream",
      Metadata: metadata,
      ACL: this.acl,
      StorageClass: this.storageClass,
      ServerSideEncryption: this.serverSideEncryption,
      CacheControl: putOptions?.cacheControl,
    });

    await this.client.send(command);

    // Get metadata of uploaded file
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: fullKey,
    });

    const head = await this.client.send(headCommand);

    return {
      href: this.keyToHref(bucket, fullKey),
      size: head.ContentLength || 0,
      type: head.ContentType || "application/octet-stream",
      lastModified: head.LastModified?.getTime() || Date.now(),
      metadata: head.Metadata,
    };
  }

  async get(href: string): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return null;
      }

      // Convert Node.js Readable to ReadableStream
      const webStream = Readable.toWeb(response.Body as Readable) as ReadableStream<Uint8Array>;

      const metadata: FileMetadata = {
        href: this.keyToHref(bucket, fullKey),
        size: response.ContentLength || 0,
        type: response.ContentType || "application/octet-stream",
        lastModified: response.LastModified?.getTime() || Date.now(),
        metadata: response.Metadata,
      };

      return [webStream, metadata];
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async delete(href: string): Promise<void> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: fullKey,
    });

    await this.client.send(command);
  }

  async exists(href: string): Promise<boolean> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async url(href: string, urlOptions?: UrlOptions): Promise<string> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    // For public-read buckets, return direct URL
    if (this.acl === "public-read") {
      return `https://${bucket}.s3.${this.region}.amazonaws.com/${fullKey}`;
    }

    // Generate presigned URL (dynamically import the presigner)
    try {
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        ResponseContentDisposition: urlOptions?.download
          ? typeof urlOptions.download === "string"
            ? `attachment; filename="${urlOptions.download}"`
            : "attachment"
          : undefined,
      });

      return getSignedUrl(this.client, command, {
        expiresIn: urlOptions?.expiresIn || 3600, // Default 1 hour
      });
    } catch (error) {
      throw new Error(
        "Failed to generate presigned URL. Please install @aws-sdk/s3-request-presigner: " +
          "npm install @aws-sdk/s3-request-presigner"
      );
    }
  }

  async copy(from: string, to: string): Promise<void> {
    const { bucket: fromBucket, key: fromKey } = this.hrefToKey(from);
    const { bucket: toBucket, key: toKey } = this.hrefToKey(to);
    const fullFromKey = this.buildKey(fromKey);
    const fullToKey = this.buildKey(toKey);

    const command = new CopyObjectCommand({
      Bucket: toBucket,
      CopySource: `${fromBucket}/${fullFromKey}`,
      Key: fullToKey,
      ACL: this.acl,
      StorageClass: this.storageClass,
      ServerSideEncryption: this.serverSideEncryption,
    });

    await this.client.send(command);
  }

  async move(from: string, to: string): Promise<void> {
    // Copy then delete
    await this.copy(from, to);
    await this.delete(from);
  }

  async *list(prefixHref?: string, listOptions?: ListOptions): AsyncIterable<FileMetadata> {
    let bucket: string | undefined;
    let keyPrefix = this.prefix;

    if (prefixHref) {
      const extracted = this.hrefToKey(prefixHref);
      bucket = extracted.bucket;
      keyPrefix = this.buildKey(extracted.key);
    } else {
      bucket = this.bucket;
    }

    if (!bucket) {
      throw new Error("Bucket must be specified either in constructor or in list prefix href");
    }

    let continuationToken: string | undefined;
    let itemsYielded = 0;
    const limit = listOptions?.limit;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: keyPrefix,
        ContinuationToken: continuationToken,
        MaxKeys: limit ? Math.min(1000, limit - itemsYielded) : 1000,
        Delimiter: listOptions?.recursive ? undefined : "/",
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          if (!item.Key) continue;

          yield {
            href: this.keyToHref(bucket, item.Key),
            size: item.Size || 0,
            type: lookupMimeType(item.Key) || "application/octet-stream",
            lastModified: item.LastModified?.getTime() || Date.now(),
          };

          itemsYielded++;
          if (limit && itemsYielded >= limit) {
            return;
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }

  async getMetadata(href: string): Promise<FileMetadata | null> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      });

      const response = await this.client.send(command);

      return {
        href: this.keyToHref(bucket, fullKey),
        size: response.ContentLength || 0,
        type: response.ContentType || "application/octet-stream",
        lastModified: response.LastModified?.getTime() || Date.now(),
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
