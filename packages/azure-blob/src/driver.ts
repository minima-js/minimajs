import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { Readable } from "node:stream";
import type { DiskDriver, DiskData, PutOptions, UrlOptions, ListOptions, FileMetadata, FileSource } from "@minimajs/disk";
import { DiskFile, resolveKey } from "@minimajs/disk";

export interface AzureBlobDriverOptions {
  /** Azure Storage connection string */
  connectionString: string;
  /** Container name */
  container: string;
  /** Custom domain/CDN URL (optional) */
  cdnUrl?: string;
}

/**
 * Convert DiskData to Buffer for Azure upload
 */
async function toBuffer(data: DiskData): Promise<Buffer> {
  if (typeof data === "string") {
    return Buffer.from(data);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof Blob) {
    return Buffer.from(await data.arrayBuffer());
  }
  if (data instanceof ReadableStream) {
    const reader = data.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported data type for Azure Blob upload");
}

/**
 * Parse connection string to get account name and key
 */
function parseConnectionString(connectionString: string): { accountName: string; accountKey: string } {
  const parts: Record<string, string> = {};
  for (const part of connectionString.split(";")) {
    const [key, ...valueParts] = part.split("=");
    if (key) {
      parts[key] = valueParts.join("=");
    }
  }

  if (!parts.AccountName || !parts.AccountKey) {
    throw new Error("Invalid connection string: missing AccountName or AccountKey");
  }

  return { accountName: parts.AccountName, accountKey: parts.AccountKey };
}

/**
 * Create an Azure Blob Storage driver for @minimajs/disk
 */
export function createAzureBlobDriver(options: AzureBlobDriverOptions): DiskDriver {
  const client = BlobServiceClient.fromConnectionString(options.connectionString);
  const container: ContainerClient = client.getContainerClient(options.container);
  const { accountName, accountKey } = parseConnectionString(options.connectionString);
  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  function getBlobUrl(key: string): string {
    if (options.cdnUrl) {
      return `${options.cdnUrl.replace(/\/$/, "")}/${key}`;
    }
    return container.getBlockBlobClient(key).url;
  }

  return {
    name: "azure-blob",

    async put(key: string, data: DiskData, putOptions?: PutOptions): Promise<DiskFile> {
      const blobClient = container.getBlockBlobClient(key);
      const buffer = await toBuffer(data);

      await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: putOptions?.contentType,
          blobCacheControl: putOptions?.cacheControl,
        },
        metadata: putOptions?.metadata,
      });

      return new DiskFile(key.split("/").pop() || key, {
        key,
        url: getBlobUrl(key),
        size: buffer.length,
        mimeType: putOptions?.contentType,
        metadata: putOptions?.metadata,
        stream: () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(buffer));
              controller.close();
            },
          }),
      });
    },

    async get(key: string): Promise<DiskFile | null> {
      const blobClient = container.getBlockBlobClient(key);

      try {
        const properties = await blobClient.getProperties();
        const downloadResponse = await blobClient.download();

        return new DiskFile(key.split("/").pop() || key, {
          key,
          url: getBlobUrl(key),
          size: properties.contentLength ?? 0,
          mimeType: properties.contentType,
          metadata: properties.metadata,
          stream: () => {
            const nodeStream = downloadResponse.readableStreamBody;
            if (!nodeStream) {
              return new ReadableStream({
                start(controller) {
                  controller.close();
                },
              });
            }
            // Convert Node.js stream to web stream
            return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
          },
        });
      } catch (error: unknown) {
        if ((error as { statusCode?: number }).statusCode === 404) {
          return null;
        }
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      const blobClient = container.getBlockBlobClient(key);
      await blobClient.deleteIfExists();
    },

    async exists(key: string): Promise<boolean> {
      const blobClient = container.getBlockBlobClient(key);
      return blobClient.exists();
    },

    async url(key: string, urlOptions?: UrlOptions): Promise<string> {
      // If no expiration, return public URL
      if (!urlOptions?.expiresIn) {
        return getBlobUrl(key);
      }

      // Generate SAS URL
      const blobClient = container.getBlockBlobClient(key);
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + urlOptions.expiresIn * 1000);

      const permissions = new BlobSASPermissions();
      permissions.read = true;

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: options.container,
          blobName: key,
          permissions,
          startsOn,
          expiresOn,
          contentDisposition: urlOptions.download
            ? typeof urlOptions.download === "string"
              ? `attachment; filename="${urlOptions.download}"`
              : "attachment"
            : undefined,
        },
        credential
      ).toString();

      return `${blobClient.url}?${sasToken}`;
    },

    async copy(from: FileSource, to: string): Promise<DiskFile> {
      const fromKey = resolveKey(from);
      const sourceBlobClient = container.getBlockBlobClient(fromKey);
      const destBlobClient = container.getBlockBlobClient(to);

      await destBlobClient.beginCopyFromURL(sourceBlobClient.url);

      // Wait for copy to complete
      let properties = await destBlobClient.getProperties();
      while (properties.copyStatus === "pending") {
        await new Promise((resolve) => setTimeout(resolve, 100));
        properties = await destBlobClient.getProperties();
      }

      if (properties.copyStatus !== "success") {
        throw new Error(`Copy failed with status: ${properties.copyStatus}`);
      }

      return new DiskFile(to.split("/").pop() || to, {
        key: to,
        url: getBlobUrl(to),
        size: properties.contentLength ?? 0,
        mimeType: properties.contentType,
        metadata: properties.metadata,
      });
    },

    async move(from: FileSource, to: string): Promise<DiskFile> {
      const result = await this.copy(from, to);
      await this.delete(resolveKey(from));
      return result;
    },

    async *list(prefix?: string, listOptions?: ListOptions): AsyncIterable<DiskFile> {
      const iterator = container.listBlobsFlat({
        prefix: prefix ?? undefined,
      });

      let count = 0;
      const limit = listOptions?.limit;

      for await (const blob of iterator) {
        if (limit !== undefined && count >= limit) break;

        yield new DiskFile(blob.name.split("/").pop() || blob.name, {
          key: blob.name,
          url: getBlobUrl(blob.name),
          size: blob.properties.contentLength ?? 0,
          mimeType: blob.properties.contentType,
        });
        count++;
      }
    },

    async getMetadata(key: string): Promise<FileMetadata | null> {
      const blobClient = container.getBlockBlobClient(key);

      try {
        const properties = await blobClient.getProperties();
        return {
          key,
          size: properties.contentLength ?? 0,
          contentType: properties.contentType,
          lastModified: properties.lastModified,
          metadata: properties.metadata,
        };
      } catch (error: unknown) {
        if ((error as { statusCode?: number }).statusCode === 404) {
          return null;
        }
        throw error;
      }
    },
  } satisfies DiskDriver;
}
