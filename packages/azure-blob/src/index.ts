import type { DiskDriver } from "@minimajs/disk";
import { BlobServiceClient } from "@azure/storage-blob";
import { type AzureBlobBaseDriverOptions, AzureBlobDriver } from "./blob-driver.js";

export * from "./blob-driver.js";
export interface AzureBlobDriverOptions extends AzureBlobBaseDriverOptions {
  connectionString: string;
}

/**
 * Create an Azure Blob Storage driver for @minimajs/disk
 *
 * Use web-native File APIs to interact with Azure Blob Storage—no need to learn the Azure SDK.
 *
 * @example
 * ```typescript
 * import { createAzureBlobDriver } from '@minimajs/azure-blob';
 * import { createDisk } from '@minimajs/disk';
 *
 * const azureDriver = createAzureBlobDriver({
 *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
 *   container: 'my-container',
 *   publicUrl: 'https://cdn.example.com', // optional CDN URL
 * });
 *
 * const disk = createDisk({ driver: azureDriver });
 *
 * // Use web-native APIs - no Azure SDK needed!
 * await disk.put('documents/file.txt', 'Hello World');
 * const file = await disk.get('documents/file.txt');
 * const text = await file.text(); // Standard File API
 * ```
 */

export function createAzureBlobDriver(options: AzureBlobDriverOptions): DiskDriver;
export function createAzureBlobDriver(client: BlobServiceClient, options: AzureBlobBaseDriverOptions): DiskDriver;
export function createAzureBlobDriver(
  clientOrOptions: BlobServiceClient | AzureBlobDriverOptions,
  options?: AzureBlobBaseDriverOptions
): DiskDriver {
  if (options !== undefined) {
    return new AzureBlobDriver(clientOrOptions as BlobServiceClient, options);
  }
  const opts = clientOrOptions as AzureBlobDriverOptions;
  const client = BlobServiceClient.fromConnectionString(opts.connectionString);
  return new AzureBlobDriver(client, opts);
}
