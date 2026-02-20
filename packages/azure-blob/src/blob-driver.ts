import { BlobServiceClient } from "@azure/storage-blob";
import { Readable } from "node:stream";
import type { DiskDriver, PutOptions, ListOptions, FileMetadata } from "@minimajs/disk";
import utils from "node:util";
export interface AzureBlobBaseDriverOptions {
  container?: string;
  /** Public URL for serving files (e.g., CDN URL) */
  publicUrl?: string;
}

/**
 * Azure Blob Storage driver for @minimajs/disk
 *
 * Provides a web-native File API interface for Azure Blob Storage,
 * eliminating the need to learn Azure SDK methods.
 *
 * @example
 * ```typescript
 * import { AzureBlobDriver } from '@minimajs/azure-blob';
 * import { createDisk } from '@minimajs/disk';
 *
 * const driver = new AzureBlobDriver({
 *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
 *   container: 'uploads',
 *   publicUrl: 'https://mycdn.azureedge.net',
 * });
 *
 * const disk = createDisk({ driver });
 *
 * // Web-native API - works like browser File API
 * const file = new File(['content'], 'test.txt');
 * await disk.put(file); // Auto-generates filename
 * await disk.put('docs/readme.md', 'Hello Azure');
 *
 * const retrieved = await disk.get('docs/readme.md');
 * const text = await retrieved.text(); // Standard File.text()
 * ```
 */
export class AzureBlobDriver implements DiskDriver {
  readonly name = "azure-blob";
  private readonly options: AzureBlobBaseDriverOptions;
  private readonly endpoint: string;

  constructor(
    public readonly client: BlobServiceClient,
    options: AzureBlobBaseDriverOptions
  ) {
    this.options = options;
    this.endpoint = client.url;
  }
  /**
   * Parse href to get container and blob name
   * Supports:
   * - https://<account>.blob.core.windows.net/<container>/<blob> (Azure standard URL)
   * - https://<custom-endpoint>/<container>/<blob> (custom endpoint)
   * - https://<cdn>.azureedge.net/<blob> (when CDN URL is configured)
   * - blob (when container is in config)
   */
  private hrefToBlob(href: string): { container: string; blob: string } {
    if (href.startsWith(this.endpoint)) {
      try {
        const url = new URL(href);
        const pathParts = url.pathname.slice(1).split("/");
        const container = pathParts[0];
        const blob = pathParts.slice(1).join("/");
        if (!container || !blob) {
          throw new Error("Container and blob name cannot be empty");
        }

        return { container, blob };
      } catch (error) {
        throw new Error(`Invalid Azure Blob URL format: ${href}`);
      }
    }

    // Handle CDN URL - convert back to blob name
    if (this.options.publicUrl && href.startsWith(this.options.publicUrl)) {
      if (!this.options.container) {
        throw new Error("Container must be specified in driver config when using CDN URLs");
      }

      // Remove CDN URL prefix and leading slash
      const blob = href.slice(this.options.publicUrl.length).replace(/^\/+/, "");

      if (!blob) {
        throw new Error("Blob name cannot be empty");
      }

      return { container: this.options.container, blob };
    }

    // Handle plain paths (only when container is configured)
    if (!this.options.container) {
      throw new Error(`Container must be specified in driver config or use Azure Blob URL format. Received: ${href}`);
    }

    // Remove leading slash if present
    const blob = href.startsWith("/") ? href.slice(1) : href;

    if (!blob) {
      throw new Error("Blob name cannot be empty");
    }

    return { container: this.options.container, blob };
  }

  private blobToHref(container: string, blob: string): string {
    return `${this.endpoint}${container}/${blob}`;
  }

  async put(href: string, stream: ReadableStream<Uint8Array>, putOptions: PutOptions): Promise<FileMetadata> {
    const { container, blob } = this.hrefToBlob(href);
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blob);

    await blobClient.uploadStream(Readable.fromWeb(stream), undefined, undefined, {
      blobHTTPHeaders: {
        blobContentType: putOptions.type,
        blobCacheControl: putOptions?.cacheControl,
      },
      metadata: putOptions?.metadata,
    });

    const properties = await blobClient.getProperties();

    return {
      href: this.blobToHref(container, blob),
      size: properties.contentLength ?? 0,
      type: properties.contentType || "application/octet-stream",
      lastModified: properties.lastModified?.getTime() || Date.now(),
      metadata: properties.metadata,
    };
  }

  async get(href: string): Promise<[ReadableStream<Uint8Array>, FileMetadata] | null> {
    const { container, blob } = this.hrefToBlob(href);
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blob);

    try {
      const [properties, downloadResponse] = await Promise.all([blobClient.getProperties(), blobClient.download()]);

      const nodeStream = downloadResponse.readableStreamBody;
      if (!nodeStream) {
        return null;
      }

      // Convert Node.js stream to web stream
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      const metadata: FileMetadata = {
        href: this.blobToHref(container, blob),
        size: properties.contentLength ?? 0,
        type: properties.contentType,
        lastModified: properties.lastModified?.getTime(),
        metadata: properties.metadata,
      };

      return [webStream, metadata];
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async delete(href: string): Promise<void> {
    const { container, blob } = this.hrefToBlob(href);
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blob);
    await blobClient.deleteIfExists();
  }

  async exists(href: string): Promise<boolean> {
    const { container, blob } = this.hrefToBlob(href);
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blob);
    return blobClient.exists();
  }

  async url(href: string): Promise<string> {
    const { container, blob } = this.hrefToBlob(href);
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blob);

    // If public URL is configured, return public URL
    if (this.options.publicUrl) {
      return `${this.options.publicUrl}/${blob}`;
    }

    // Return direct Azure Blob URL
    return blobClient.url;
  }

  async copy(from: string, to: string): Promise<void> {
    const { container: fromContainer, blob: fromBlob } = this.hrefToBlob(from);
    const { container: toContainer, blob: toBlob } = this.hrefToBlob(to);

    const sourceClient = this.client.getContainerClient(fromContainer);
    const sourceBlobClient = sourceClient.getBlockBlobClient(fromBlob);

    const destClient = this.client.getContainerClient(toContainer);
    const destBlobClient = destClient.getBlockBlobClient(toBlob);

    const poller = await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
    await poller.pollUntilDone();
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to);
    await this.delete(from);
  }

  async *list(prefixHref?: string, listOptions?: ListOptions): AsyncIterable<FileMetadata> {
    let container: string;
    let prefix: string | undefined;

    if (prefixHref) {
      const parsed = this.hrefToBlob(prefixHref);
      container = parsed.container;
      prefix = parsed.blob;
    } else {
      if (!this.options.container) {
        throw new Error("Container must be specified either in constructor or in list prefix href");
      }
      container = this.options.container;
    }

    const containerClient = this.client.getContainerClient(container);
    const iterator = containerClient.listBlobsFlat({
      prefix: prefix ?? undefined,
    });

    let count = 0;
    const limit = listOptions?.limit;

    for await (const blob of iterator) {
      if (limit !== undefined && count >= limit) break;

      yield {
        href: this.blobToHref(container, blob.name),
        size: blob.properties.contentLength ?? 0,
        type: blob.properties.contentType,
        lastModified: blob.properties.lastModified?.getTime() || Date.now(),
      } satisfies FileMetadata;
      count++;
    }
  }

  async getMetadata(href: string): Promise<FileMetadata | null> {
    const { container, blob } = this.hrefToBlob(href);
    const containerClient = this.client.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blob);

    try {
      const properties = await blobClient.getProperties();
      return {
        href: this.blobToHref(container, blob),
        size: properties.contentLength ?? 0,
        type: properties.contentType,
        lastModified: properties.lastModified?.getTime() || Date.now(),
        metadata: properties.metadata,
      };
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  [utils.inspect.custom]() {
    const options = {
      container: this.options.container,
      account: this.client.accountName,
      publicUrl: this.options.publicUrl,
      [Symbol.toStringTag]: `AzureBlobDriver`,
    };

    for (const [key, val] of Object.entries(options)) {
      if (val === undefined) {
        delete (options as any)[key];
      }
    }
    return options;
  }

  [Symbol.toStringTag] = "AzureBlobDriver";
}
