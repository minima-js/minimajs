import { describe, test, jest } from "@jest/globals";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { BlobServiceClient } from "@azure/storage-blob";
import { AzureBlobDriver } from "../blob-driver.js";
import { createAzureBlobDriver } from "../index.js";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const ENDPOINT = "https://myaccount.blob.core.windows.net/";

function textToNodeReadable(text: string): Readable {
  return Readable.from([Buffer.from(text)]);
}

interface MockBlobProperties {
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  statusCode?: number;
}

function createMockBlockBlobClient(content = "hello world", properties: MockBlobProperties = {}) {
  const props: MockBlobProperties = {
    contentLength: properties.contentLength ?? content.length,
    contentType: properties.contentType ?? "text/plain",
    lastModified: properties.lastModified ?? new Date(1_000_000),
    metadata: properties.metadata ?? {},
    ...properties,
  };

  const blobUrl = `${ENDPOINT}uploads/${content.slice(0, 8)}`;

  return {
    url: blobUrl,
    uploadStream: jest.fn(async () => ({})),
    getProperties: jest.fn(async () => props),
    download: jest.fn(async () => ({
      readableStreamBody: textToNodeReadable(content),
    })),
    deleteIfExists: jest.fn(async () => ({})),
    exists: jest.fn(async () => true),
    beginCopyFromURL: jest.fn(async (_url: string) => ({
      pollUntilDone: jest.fn(async () => ({})),
    })),
    setMetadata: jest.fn(async () => ({})),
    setHTTPHeaders: jest.fn(async () => ({})),
  };
}

function createMockContainerClient(
  blobs: Map<string, ReturnType<typeof createMockBlockBlobClient>> = new Map(),
  listItems: any[] = []
) {
  const getBlobClient = jest.fn((blob: string) => {
    return blobs.get(blob) ?? createMockBlockBlobClient("default content");
  });

  const listBlobsFlat = jest.fn(() => ({
    [Symbol.asyncIterator]: async function* () {
      for (const item of listItems) {
        yield item;
      }
    },
  }));

  return { getBlockBlobClient: getBlobClient, listBlobsFlat };
}

interface MockAzureClientOptions {
  /** Map of container name → container client mock */
  containers?: Map<string, ReturnType<typeof createMockContainerClient>>;
}

function createMockAzureClient(options: MockAzureClientOptions = {}) {
  const containerCache = new Map<string, ReturnType<typeof createMockContainerClient>>(options.containers);

  const getContainerClient = jest.fn((container: string) => {
    if (!containerCache.has(container)) {
      containerCache.set(container, createMockContainerClient());
    }
    return containerCache.get(container)!;
  });

  const client = {
    url: ENDPOINT,
    accountName: "myaccount",
    getContainerClient,
  } as unknown as BlobServiceClient;

  return { client, getContainerClient, containerCache };
}

// ---------------------------------------------------------------------------
// hrefToBlob — href parsing (exercised via public methods)
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — href parsing", () => {
  test("parses Azure standard endpoint URL", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["path/to/file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client, getContainerClient } = createMockAzureClient({ containers: containerMap });
    const driver = new AzureBlobDriver(client, { container: "uploads" });

    await driver.exists(`${ENDPOINT}uploads/path/to/file.txt`);

    assert.ok((getContainerClient as any).mock.calls[0]![0] === "uploads");
    const getBlob = containerMap.get("uploads")!.getBlockBlobClient;
    assert.equal((getBlob as any).mock.calls[0]![0], "path/to/file.txt");
  });

  test("uses container from config for plain key hrefs", async () => {
    const { client, getContainerClient } = createMockAzureClient();
    const driver = new AzureBlobDriver(client, { container: "my-container" });

    await driver.exists("some/blob.txt");

    assert.equal((getContainerClient as any).mock.calls[0]![0], "my-container");
  });

  test("resolves CDN publicUrl href back to blob", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["images/photo.jpg", blobClient]]);
    const containerMap = new Map([["my-container", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, {
      container: "my-container",
      publicUrl: "https://cdn.azureedge.net",
    });

    await driver.exists("https://cdn.azureedge.net/images/photo.jpg");

    const getBlob = containerMap.get("my-container")!.getBlockBlobClient;
    assert.equal((getBlob as any).mock.calls[0]![0], "images/photo.jpg");
  });

  test("throws when no container is configured and href is a plain key", async () => {
    const { client } = createMockAzureClient();
    const driver = new AzureBlobDriver(client, {});

    await assert.rejects(() => driver.exists("plain-key.txt"), /Container must be specified/);
  });
});

// ---------------------------------------------------------------------------
// put
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — put", () => {
  test("returns FileMetadata from getProperties after upload", async () => {
    const blobClient = createMockBlockBlobClient("uploaded content", {
      contentLength: 16,
      contentType: "text/plain",
      lastModified: new Date(2_000_000),
      metadata: { author: "alice" },
    });
    const blobs = new Map([["doc.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("uploaded content"));
        ctrl.close();
      },
    });

    const metadata = await driver.put("doc.txt", stream, { type: "text/plain" });

    assert.ok(metadata.href.includes("doc.txt"));
    assert.equal(metadata.size, 16);
    assert.equal(metadata.type, "text/plain");
    assert.deepEqual(metadata.metadata, { author: "alice" });
  });

  test("uploadStream is called with content type", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("data"));
        ctrl.close();
      },
    });

    await driver.put("file.txt", stream, { type: "application/json" });

    const uploadCall = (blobClient.uploadStream as any).mock.calls[0];
    assert.ok(uploadCall, "uploadStream should be called");
    const uploadOptions = uploadCall[3];
    assert.equal(uploadOptions.blobHTTPHeaders.blobContentType, "application/json");
  });

  test("forwards metadata to uploadStream", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["meta.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("x"));
        ctrl.close();
      },
    });

    await driver.put("meta.txt", stream, {
      type: "text/plain",
      metadata: { userId: "99" },
    });

    const uploadCall = (blobClient.uploadStream as any).mock.calls[0];
    assert.deepEqual(uploadCall[3].metadata, { userId: "99" });
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — get", () => {
  test("returns stream and metadata for an existing blob", async () => {
    const blobClient = createMockBlockBlobClient("file content", {
      contentLength: 12,
      contentType: "text/plain",
      lastModified: new Date(3_000_000),
    });
    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const result = await driver.get("file.txt");

    assert.ok(result);
    const [stream, meta] = result;
    assert.ok(stream instanceof ReadableStream);
    assert.ok(meta.href.includes("file.txt"));
    assert.equal(meta.size, 12);
  });

  test("returns null for 404 status", async () => {
    const blobClient = createMockBlockBlobClient();
    const notFoundErr: any = new Error("BlobNotFound");
    notFoundErr.statusCode = 404;
    (blobClient.getProperties as any).mockRejectedValueOnce(notFoundErr);
    (blobClient.download as any).mockRejectedValueOnce(notFoundErr);

    const blobs = new Map([["missing.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const result = await driver.get("missing.txt");
    assert.equal(result, null);
  });

  test("rethrows non-404 errors", async () => {
    const blobClient = createMockBlockBlobClient();
    const serverErr: any = new Error("InternalServerError");
    serverErr.statusCode = 500;
    (blobClient.getProperties as any).mockRejectedValueOnce(serverErr);

    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    await assert.rejects(() => driver.get("file.txt"), { message: "InternalServerError" });
  });
});

// ---------------------------------------------------------------------------
// exists
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — exists", () => {
  test("returns true when blob exists", async () => {
    const blobClient = createMockBlockBlobClient();
    (blobClient.exists as any).mockResolvedValueOnce(true);

    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    assert.equal(await driver.exists("file.txt"), true);
  });

  test("returns false when blob does not exist", async () => {
    const blobClient = createMockBlockBlobClient();
    (blobClient.exists as any).mockResolvedValueOnce(false);

    const blobs = new Map([["missing.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    assert.equal(await driver.exists("missing.txt"), false);
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — delete", () => {
  test("calls deleteIfExists on the blob client", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["to-delete.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    await driver.delete("to-delete.txt");

    assert.ok((blobClient.deleteIfExists as any).mock.calls.length > 0);
  });
});

// ---------------------------------------------------------------------------
// copy
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — copy", () => {
  test("calls beginCopyFromURL with source blob URL", async () => {
    const sourceBlobClient = createMockBlockBlobClient("source content");
    const destBlobClient = createMockBlockBlobClient("dest");

    const blobs = new Map([
      ["source.txt", sourceBlobClient],
      ["dest.txt", destBlobClient],
    ]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    await driver.copy("source.txt", "dest.txt");

    const copyCall = (destBlobClient.beginCopyFromURL as any).mock.calls[0];
    assert.ok(copyCall, "beginCopyFromURL should be called");
    // The source URL should be the sourceBlobClient.url
    assert.equal(copyCall[0], sourceBlobClient.url);
  });
});

// ---------------------------------------------------------------------------
// move
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — move", () => {
  test("copies then deletes the source blob", async () => {
    const sourceBlobClient = createMockBlockBlobClient("source content");
    const destBlobClient = createMockBlockBlobClient("dest");

    const blobs = new Map([
      ["source.txt", sourceBlobClient],
      ["dest.txt", destBlobClient],
    ]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    await driver.move("source.txt", "dest.txt");

    assert.ok((destBlobClient.beginCopyFromURL as any).mock.calls.length > 0, "should copy");
    assert.ok((sourceBlobClient.deleteIfExists as any).mock.calls.length > 0, "should delete source");
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — list", () => {
  test("yields FileMetadata for each blob", async () => {
    const listItems = [
      { name: "images/a.jpg", properties: { contentLength: 100, contentType: "image/jpeg", lastModified: new Date(1000) } },
      { name: "images/b.jpg", properties: { contentLength: 200, contentType: "image/jpeg", lastModified: new Date(2000) } },
    ];

    const containerMap = new Map([["uploads", createMockContainerClient(new Map(), listItems)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const files: any[] = [];
    for await (const file of driver.list("", {})) {
      files.push(file);
    }

    assert.equal(files.length, 2);
    assert.ok(files[0]!.href.includes("images/a.jpg"));
    assert.equal(files[0]!.size, 100);
    assert.ok(files[1]!.href.includes("images/b.jpg"));
  });

  test("respects limit option", async () => {
    const listItems = [
      { name: "a.txt", properties: { contentLength: 1, lastModified: new Date() } },
      { name: "b.txt", properties: { contentLength: 2, lastModified: new Date() } },
      { name: "c.txt", properties: { contentLength: 3, lastModified: new Date() } },
    ];

    const containerMap = new Map([["uploads", createMockContainerClient(new Map(), listItems)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const files: any[] = [];
    for await (const file of driver.list("", { limit: 2 })) {
      files.push(file);
    }

    assert.equal(files.length, 2);
  });

  test("throws when no container is given and none in config", async () => {
    const { client } = createMockAzureClient();
    const driver = new AzureBlobDriver(client, {});

    await assert.rejects(async () => {
      for await (const _ of driver.list("", {})) {
        // iterate
      }
    }, /Container must be specified/);
  });
});

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — metadata", () => {
  test("returns FileMetadata from getProperties", async () => {
    const blobClient = createMockBlockBlobClient("data", {
      contentLength: 4,
      contentType: "application/octet-stream",
      lastModified: new Date(9_000_000),
      metadata: { tag: "production" },
    });
    const blobs = new Map([["data.bin", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    const meta = await driver.metadata("data.bin");

    assert.ok(meta);
    assert.ok(meta.href.includes("data.bin"));
    assert.equal(meta.size, 4);
    assert.equal(meta.type, "application/octet-stream");
    assert.deepEqual(meta.metadata, { tag: "production" });
  });

  test("returns null for 404 status", async () => {
    const blobClient = createMockBlockBlobClient();
    const err: any = new Error("BlobNotFound");
    err.statusCode = 404;
    (blobClient.getProperties as any).mockRejectedValueOnce(err);

    const blobs = new Map([["missing.bin", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    assert.equal(await driver.metadata("missing.bin"), null);
  });
});

// ---------------------------------------------------------------------------
// url
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — url", () => {
  test("returns publicUrl + blob when publicUrl is configured", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["images/photo.jpg", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, {
      container: "uploads",
      publicUrl: "https://cdn.example.com",
    });

    const url = await driver.url("images/photo.jpg");
    assert.equal(url, "https://cdn.example.com/images/photo.jpg");
  });

  test("returns blobClient.url when no publicUrl", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobUrl = `${ENDPOINT}uploads/file.txt`;
    (blobClient as any).url = blobUrl;

    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    const url = await driver.url("file.txt");
    assert.equal(url, blobUrl);
  });
});

// ---------------------------------------------------------------------------
// updateMetadata
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — updateMetadata", () => {
  test("updates metadata via setMetadata", async () => {
    const blobClient = createMockBlockBlobClient("content", {
      contentLength: 7,
      contentType: "text/plain",
      lastModified: new Date(1_000_000),
      metadata: { old: "value" },
    });
    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    const result = await driver.updateMetadata("file.txt", { metadata: { new: "value" } });

    const setMetaCall = (blobClient.setMetadata as any).mock.calls[0];
    assert.ok(setMetaCall);
    assert.deepEqual(setMetaCall[0], { new: "value" });
    assert.deepEqual(result.metadata, { new: "value" });
  });

  test("updates content type via setHTTPHeaders", async () => {
    const blobClient = createMockBlockBlobClient("content", {
      contentLength: 7,
      contentType: "text/plain",
      lastModified: new Date(1_000_000),
    });
    const blobs = new Map([["file.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    const result = await driver.updateMetadata("file.txt", { type: "application/json" });

    const setHeadersCall = (blobClient.setHTTPHeaders as any).mock.calls[0];
    assert.ok(setHeadersCall);
    assert.equal(setHeadersCall[0].blobContentType, "application/json");
    assert.equal(result.type, "application/json");
  });

  test("can update both metadata and content type simultaneously", async () => {
    const blobClient = createMockBlockBlobClient("x", {
      contentLength: 1,
      contentType: "text/plain",
      lastModified: new Date(),
    });
    const blobs = new Map([["doc.txt", blobClient]]);
    const containerMap = new Map([["uploads", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "uploads" });
    await driver.updateMetadata("doc.txt", {
      type: "application/json",
      metadata: { env: "test" },
    });

    assert.ok((blobClient.setMetadata as any).mock.calls.length > 0, "setMetadata should be called");
    assert.ok((blobClient.setHTTPHeaders as any).mock.calls.length > 0, "setHTTPHeaders should be called");
  });
});

// ---------------------------------------------------------------------------
// createAzureBlobDriver factory
// ---------------------------------------------------------------------------

describe("createAzureBlobDriver factory", () => {
  test("accepts an existing BlobServiceClient", () => {
    const { client } = createMockAzureClient();
    const driver = createAzureBlobDriver(client, { container: "uploads" });
    assert.ok(driver);
  });
});

// ---------------------------------------------------------------------------
// blobToHref — href format
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — blobToHref", () => {
  test("constructed href includes endpoint + container + blob", async () => {
    const blobClient = createMockBlockBlobClient("data", { contentLength: 4 });
    const blobs = new Map([["path/to/file.txt", blobClient]]);
    const containerMap = new Map([["mycontainer", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient({ containers: containerMap });

    const driver = new AzureBlobDriver(client, { container: "mycontainer" });
    const meta = await driver.metadata("path/to/file.txt");

    assert.ok(meta);
    assert.ok(meta.href.startsWith(ENDPOINT), `expected href to start with ${ENDPOINT}, got: ${meta.href}`);
    assert.ok(meta.href.includes("mycontainer/path/to/file.txt"));
  });
});
