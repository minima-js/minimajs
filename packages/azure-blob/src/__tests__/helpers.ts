import { jest } from "@jest/globals";
import { Readable } from "node:stream";
import { BlobServiceClient } from "@azure/storage-blob";
import { AzureBlobDriver } from "../blob-driver.js";
export { text2stream } from "@minimajs/disk/helpers";

export const ENDPOINT = "https://myaccount.blob.core.windows.net/";

export interface MockBlobProperties {
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export type MockFn = ((...args: any[]) => any) & { mock: { calls: any[][] } };

export interface MockBlockBlobClient {
  url: string;
  uploadStream: MockFn;
  getProperties: MockFn;
  download: MockFn;
  deleteIfExists: MockFn;
  exists: MockFn;
  beginCopyFromURL: MockFn;
  setMetadata: MockFn;
  setHTTPHeaders: MockFn;
}

export function createMockBlockBlobClient(
  content = "hello world",
  properties: MockBlobProperties = {}
): MockBlockBlobClient {
  const props = {
    contentLength: properties.contentLength ?? content.length,
    contentType: properties.contentType ?? "text/plain",
    lastModified: properties.lastModified ?? new Date(1_000_000),
    metadata: properties.metadata ?? {},
    ...properties,
  };
  return {
    url: `${ENDPOINT}uploads/${content.slice(0, 8)}`,
    uploadStream: jest.fn(async () => ({})),
    getProperties: jest.fn(async () => props),
    download: jest.fn(async () => ({ readableStreamBody: Readable.from([Buffer.from(content)]) })),
    deleteIfExists: jest.fn(async () => ({})),
    exists: jest.fn(async () => true),
    beginCopyFromURL: jest.fn(async (_url: string) => ({ pollUntilDone: jest.fn(async () => ({})) })),
    setMetadata: jest.fn(async () => ({})),
    setHTTPHeaders: jest.fn(async () => ({})),
  };
}

export type MockBlobClient = MockBlockBlobClient;

export interface MockContainerClient {
  getBlockBlobClient: MockFn;
  listBlobsFlat: MockFn;
}

export function createMockContainerClient(
  blobs: Map<string, MockBlobClient> = new Map(),
  listItems: any[] = []
): MockContainerClient {
  return {
    getBlockBlobClient: jest.fn((blob: string) => blobs.get(blob) ?? createMockBlockBlobClient()),
    listBlobsFlat: jest.fn(() => ({
      [Symbol.asyncIterator]: async function* () {
        for (const item of listItems) yield item;
      },
    })),
  };
}

export interface MockAzureClient {
  client: BlobServiceClient;
  getContainerClient: MockFn;
  cache: Map<string, MockContainerClient>;
}

export function createMockAzureClient(containers?: Map<string, MockContainerClient>): MockAzureClient {
  const cache = new Map<string, MockContainerClient>(containers);
  const getContainerClient = jest.fn((name: string) => {
    if (!cache.has(name)) cache.set(name, createMockContainerClient());
    return cache.get(name)!;
  });
  const client = { url: ENDPOINT, accountName: "myaccount", getContainerClient } as unknown as BlobServiceClient;
  return { client, getContainerClient, cache };
}

export interface SetupResult {
  driver: AzureBlobDriver;
  blobClient: MockBlobClient;
  containerMap: Map<string, MockContainerClient>;
  client: BlobServiceClient;
  getContainerClient: MockFn;
  cache: Map<string, MockContainerClient>;
}

/** One-liner test setup: blob key + optional content/props → { driver, blobClient } */
export function setup(
  key: string,
  content = "hello world",
  props: MockBlobProperties = {},
  driverOptions: Record<string, any> = {}
): SetupResult {
  const blobClient = createMockBlockBlobClient(content, props);
  const blobs = new Map([[key, blobClient]]);
  const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
  const { client, getContainerClient, cache } = createMockAzureClient(containerMap);
  const driver = new AzureBlobDriver(client, { container: "uploads", ...driverOptions });
  return { driver, blobClient, containerMap, client, getContainerClient, cache };
}
