import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  type ObjectCannedACL,
  type StorageClass,
  type ServerSideEncryption,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { DiskDriver, DriverCapabilities, FileMetadata, PutOptions, ListOptions } from "@minimajs/disk";
import { Readable } from "node:stream";
import { inspect } from "node:util";

export interface S3BaseDriverOptions {
  /** S3 bucket name (optional if bucket is in the href path) */
  bucket?: string;
  /** Base prefix/path within the bucket */
  prefix?: string;
  /** Default ACL for uploaded objects */
  acl?: ObjectCannedACL;
  /** Default storage class */
  storageClass?: StorageClass;
  /** Default server-side encryption */
  serverSideEncryption?: ServerSideEncryption;
  /** Public URL for serving files (e.g., CloudFront CDN URL) */
  publicUrl?: string;
}

/**
 * AWS S3 storage driver for @minimajs/disk
 *
 * Provides a web-native File API interface for AWS S3,
 * eliminating the need to learn AWS SDK methods.
 *
 * @example
 * ```typescript
 * import { S3Driver } from '@minimajs/aws-s3';
 * import { createDisk } from '@minimajs/disk';
 *
 * const driver = new S3Driver({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   },
 *   publicUrl: 'https://d1234.cloudfront.net',
 *   storageClass: 'STANDARD_IA',
 * });
 *
 * const disk = createDisk({ driver });
 *
 * // Web-native API - works like browser File API
 * const file = new File(['content'], 'test.txt');
 * await disk.put(file); // Auto-generates filename
 * await disk.put('photos/sunset.jpg', imageBuffer);
 *
 * const retrieved = await disk.get('photos/sunset.jpg');
 * const arrayBuffer = await retrieved.arrayBuffer(); // Standard File.arrayBuffer()
 * ```
 */
export class S3Driver implements DiskDriver {
  readonly name = "s3";
  readonly capabilities: DriverCapabilities = { metadata: true };

  private readonly bucket?: string;
  private readonly prefix: string;
  private readonly acl?: ObjectCannedACL;
  private readonly storageClass?: StorageClass;
  private readonly serverSideEncryption?: ServerSideEncryption;
  private readonly publicUrl?: string;

  constructor(
    public readonly client: S3Client,
    options: S3BaseDriverOptions
  ) {
    const { bucket, prefix = "", acl, storageClass, serverSideEncryption, publicUrl } = options;

    this.bucket = bucket;
    this.prefix = prefix;
    this.acl = acl;
    this.storageClass = storageClass;
    this.serverSideEncryption = serverSideEncryption;
    this.publicUrl = publicUrl;
  }

  /**
   * Extract bucket and S3 key from href
   * Supports:
   * - s3://bucket/key (when bucket is not in constructor)
   * - https://cdn.example.com/key (when public URL is configured)
   * - key (when bucket is in constructor)
   */
  private hrefToKey(href: string): { bucket: string; key: string } {
    // Handle public URL - convert back to S3 key
    if (this.publicUrl && href.startsWith(this.publicUrl)) {
      if (!this.bucket) {
        throw new Error("Bucket must be specified in driver config when using public URLs");
      }

      // Remove public URL prefix and leading slash
      const key = href.slice(this.publicUrl.length).replace(/^\/+/, "");

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

  /**
   * Get AWS partition suffix based on region
   */
  private getPartitionSuffix(region: string): string {
    if (region.startsWith("cn-")) {
      return "amazonaws.com.cn";
    }
    if (region.startsWith("us-iso-")) {
      return "c2s.ic.gov";
    }
    if (region.startsWith("us-isob-")) {
      return "sc2s.sgov.gov";
    }
    return "amazonaws.com";
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions: PutOptions): Promise<FileMetadata> {
    const { bucket, key } = this.hrefToKey(href);
    const fullKey = this.buildKey(key);
    // Convert ReadableStream to Node.js Readable
    const nodeStream = Readable.fromWeb(stream);

    // Prepare metadata
    const metadata: Record<string, string> = {};
    if (putOptions.metadata) {
      Object.assign(metadata, putOptions.metadata);
    }

    await new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: fullKey,
        Body: nodeStream,
        ContentType: putOptions.type,
        Metadata: metadata,
        ACL: this.acl,
        StorageClass: this.storageClass,
        ServerSideEncryption: this.serverSideEncryption,
        CacheControl: putOptions?.cacheControl,
      },
    }).done();

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
        type: response.ContentType,
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

    // If public URL is configured, return public URL
    if (this.publicUrl) {
      return `${this.publicUrl}/${fullKey}`;
    }

    // Get region from client config
    const region = await this.client.config.region();

    // If custom endpoint is configured, use it
    if (this.client.config.endpoint) {
      const epConfig = await this.client.config.endpoint();
      const endpointUrl = `${epConfig.protocol}//${epConfig.hostname}${epConfig.port ? `:${epConfig.port}` : ""}`;

      if (this.client.config.forcePathStyle) {
        // Path-style: https://endpoint/bucket/key
        return `${endpointUrl}/${bucket}/${fullKey}`;
      }

      // Virtual-hosted style: https://bucket.endpoint/key
      return `${epConfig.protocol}//${bucket}.${epConfig.hostname}${epConfig.port ? `:${epConfig.port}` : ""}/${fullKey}`;
    }

    // Determine the AWS partition suffix based on region
    const partitionSuffix = this.getPartitionSuffix(region);

    // Default AWS S3 URL with correct partition
    if (this.client.config.forcePathStyle) {
      return `https://s3.${region}.${partitionSuffix}/${bucket}/${fullKey}`;
    }

    return `https://${bucket}.s3.${region}.${partitionSuffix}/${fullKey}`;
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

  async *list(prefixHref: string, listOptions: ListOptions): AsyncIterable<FileMetadata> {
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
        Delimiter: listOptions.recursive ? undefined : "/",
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          if (!item.Key) continue;

          // We'd need HeadObject for accurate type, but that's expensive
          // For now, return undefined and let consumer fetch metadata if needed
          yield {
            href: this.keyToHref(bucket, item.Key),
            size: item.Size || 0,
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

  async metadata(href: string): Promise<FileMetadata | null> {
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
        type: response.ContentType,
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

  [inspect.custom]() {
    return {
      bucket: this.bucket,
      [Symbol.toStringTag]: `AwsS3Driver`,
    };
  }

  get [Symbol.toStringTag]() {
    return `AwsS3Driver`;
  }
}
