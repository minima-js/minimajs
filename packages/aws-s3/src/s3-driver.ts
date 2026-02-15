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
import type { DiskDriver, FileMetadata, PutOptions, ListOptions } from "@minimajs/disk";
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
  acl?: ObjectCannedACL;
  /** Default storage class */
  storageClass?: StorageClass;
  /** Default server-side encryption */
  serverSideEncryption?: ServerSideEncryption;
  /** CDN URL (e.g., 'https://cdn.example.com' or 'https://d1234567890.cloudfront.net') */
  cdnUrl?: string;
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
  private readonly cdnUrl?: string;
  private readonly s3Config: S3ClientConfig;

  constructor(options: S3DriverOptions) {
    const { bucket, region, prefix = "", acl, storageClass, serverSideEncryption, cdnUrl, ...s3Config } = options;

    this.bucket = bucket;
    this.region = region;
    this.prefix = prefix;
    this.acl = acl;
    this.storageClass = storageClass;
    this.serverSideEncryption = serverSideEncryption;
    this.cdnUrl = cdnUrl;
    this.s3Config = s3Config;
    this.client = new S3Client({ region, ...s3Config });
  }

  /**
   * Extract bucket and S3 key from href
   * Supports:
   * - s3://bucket/key (when bucket is not in constructor)
   * - https://cdn.example.com/key (when CDN URL is configured)
   * - key (when bucket is in constructor)
   */
  private hrefToKey(href: string): { bucket: string; key: string } {
    // Handle CDN URL - convert back to S3 key
    if (this.cdnUrl && href.startsWith(this.cdnUrl)) {
      if (!this.bucket) {
        throw new Error("Bucket must be specified in driver config when using CDN URLs");
      }

      // Remove CDN URL prefix and leading slash
      const key = href.slice(this.cdnUrl.length).replace(/^\/+/, "");

      if (!key) {
        throw new Error("S3 key cannot be empty");
      }

      return { bucket: this.bucket, key };
    }

    // Handle s3:// protocol
    if (href.startsWith("s3://")) {
      try {
        const url = new URL(href);
        const bucket = url.hostname;
        const key = url.pathname.slice(1);

        if (!key) {
          throw new Error("S3 key cannot be empty");
        }

        return { bucket, key };
      } catch (error) {
        throw new Error(`Invalid S3 href format: ${href}`);
      }
    }

    // Handle plain paths (only when bucket is configured)
    if (!this.bucket) {
      throw new Error(`Bucket must be specified in driver config or use s3:// protocol. Received: ${href}`);
    }

    // Remove leading slash if present
    const key = href.startsWith("/") ? href.slice(1) : href;

    if (!key) {
      throw new Error("S3 key cannot be empty");
    }

    return { bucket: this.bucket, key };
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

  async url(href: string): Promise<string> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);

    // If CDN URL is configured, return CDN URL
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${fullKey}`;
    }

    // If custom endpoint is configured
    if (this.s3Config.endpoint) {
      // Extract endpoint URL string
      let endpointUrl: string;
      if (typeof this.s3Config.endpoint === "string") {
        endpointUrl = this.s3Config.endpoint;
      } else if (typeof this.s3Config.endpoint === "object" && "url" in this.s3Config.endpoint) {
        endpointUrl = this.s3Config.endpoint.url.toString();
      } else {
        // Fallback to default AWS S3
        endpointUrl = `https://s3.${this.region}.amazonaws.com`;
      }

      // Ensure protocol
      if (!endpointUrl.startsWith("http")) {
        endpointUrl = `https://${endpointUrl}`;
      }

      if (this.s3Config.forcePathStyle) {
        // Path-style: https://endpoint/bucket/key
        return `${endpointUrl}/${bucket}/${fullKey}`;
      }

      // Virtual-hosted style: https://bucket.endpoint/key
      const [protocol, rest] = endpointUrl.split("://");
      return `${protocol}://${bucket}.${rest}/${fullKey}`;
    }

    // Default AWS S3 URL
    if (this.s3Config.forcePathStyle) {
      return `https://s3.${this.region}.amazonaws.com/${bucket}/${fullKey}`;
    }

    return `https://${bucket}.s3.${this.region}.amazonaws.com/${fullKey}`;
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
