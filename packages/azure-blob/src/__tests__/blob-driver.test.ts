import { describe, test, expect } from "@jest/globals";
import { AzureBlobDriver } from "../blob-driver.js";
import { createAzureBlobDriver } from "../index.js";
import {
  ENDPOINT,
  setup,
  text2stream,
  createMockBlockBlobClient,
  createMockContainerClient,
  createMockAzureClient,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// href parsing
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — href parsing", () => {
  test("parses Azure standard endpoint URL", async () => {
    const { driver, getContainerClient, containerMap } = setup("path/to/file.txt");

    await driver.exists(`${ENDPOINT}uploads/path/to/file.txt`, {});

    expect((getContainerClient as any).mock.calls[0]![0]).toBe("uploads");
    expect((containerMap.get("uploads")!.getBlockBlobClient as any).mock.calls[0]![0]).toBe("path/to/file.txt");
  });

  test("uses container from config for plain key hrefs", async () => {
    const { client } = createMockAzureClient();
    const getContainerClient = (client as any).getContainerClient;
    const driver = new AzureBlobDriver(client, { container: "my-container" });

    await driver.exists("some/blob.txt", {});

    expect(getContainerClient.mock.calls[0]![0]).toBe("my-container");
  });

  test("resolves CDN publicUrl href back to blob", async () => {
    const blobClient = createMockBlockBlobClient();
    const blobs = new Map([["images/photo.jpg", blobClient]]);
    const containerMap = new Map([["my-container", createMockContainerClient(blobs)]]);
    const { client } = createMockAzureClient(containerMap);
    const driver = new AzureBlobDriver(client, { container: "my-container", publicUrl: "https://cdn.azureedge.net" });

    await driver.exists("https://cdn.azureedge.net/images/photo.jpg", {});

    expect((containerMap.get("my-container")!.getBlockBlobClient as any).mock.calls[0]![0]).toBe("images/photo.jpg");
  });

  test("throws when no container is configured and href is a plain key", async () => {
    const { client } = createMockAzureClient();
    const driver = new AzureBlobDriver(client, {});
    await expect(driver.exists("plain-key.txt", {})).rejects.toThrow(/Container must be specified/);
  });
});

// ---------------------------------------------------------------------------
// put
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — put", () => {
  test("returns FileMetadata from getProperties after upload", async () => {
    const { driver } = setup("doc.txt", "uploaded content", {
      contentLength: 16,
      contentType: "text/plain",
      lastModified: new Date(2_000_000),
      metadata: { author: "alice" },
    });

    const metadata = await driver.put("doc.txt", text2stream("uploaded content"), { type: "text/plain" });

    expect(metadata.href).toContain("doc.txt");
    expect(metadata.size).toBe(16);
    expect(metadata.type).toBe("text/plain");
    expect(metadata.metadata).toEqual({ author: "alice" });
  });

  test("uploadStream is called with content type", async () => {
    const { driver, blobClient } = setup("file.txt");

    await driver.put("file.txt", text2stream("data"), { type: "application/json" });

    const uploadCall = (blobClient.uploadStream as any).mock.calls[0];
    expect(uploadCall).toBeTruthy();
    expect(uploadCall[3].blobHTTPHeaders.blobContentType).toBe("application/json");
  });

  test("forwards metadata to uploadStream", async () => {
    const { driver, blobClient } = setup("meta.txt");

    await driver.put("meta.txt", text2stream("x"), { type: "text/plain", metadata: { userId: "99" } });

    expect((blobClient.uploadStream as any).mock.calls[0]![3].metadata).toEqual({ userId: "99" });
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — get", () => {
  test("returns stream and metadata for an existing blob", async () => {
    const { driver } = setup("file.txt", "file content", { contentLength: 12 });

    const result = await driver.get("file.txt", {});

    expect(result).toBeTruthy();
    const [stream, meta] = result!;
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(meta.href).toContain("file.txt");
    expect(meta.size).toBe(12);
  });

  test("returns null for 404 status", async () => {
    const { driver, blobClient } = setup("missing.txt");
    const err: any = Object.assign(new Error("BlobNotFound"), { statusCode: 404 });
    (blobClient.getProperties as any).mockRejectedValueOnce(err);
    (blobClient.download as any).mockRejectedValueOnce(err);

    expect(await driver.get("missing.txt", {})).toBe(null);
  });

  test("rethrows non-404 errors", async () => {
    const { driver, blobClient } = setup("file.txt");
    const err: any = Object.assign(new Error("InternalServerError"), { statusCode: 500 });
    (blobClient.getProperties as any).mockRejectedValueOnce(err);

    await expect(driver.get("file.txt", {})).rejects.toThrow("InternalServerError");
  });
});

// ---------------------------------------------------------------------------
// exists
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — exists", () => {
  test("returns true when blob exists", async () => {
    const { driver, blobClient } = setup("file.txt");
    (blobClient.exists as any).mockResolvedValueOnce(true);
    expect(await driver.exists("file.txt", {})).toBe(true);
  });

  test("returns false when blob does not exist", async () => {
    const { driver, blobClient } = setup("missing.txt");
    (blobClient.exists as any).mockResolvedValueOnce(false);
    expect(await driver.exists("missing.txt", {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — delete", () => {
  test("calls deleteIfExists on the blob client", async () => {
    const { driver, blobClient } = setup("to-delete.txt");
    await driver.delete("to-delete.txt", {});
    expect((blobClient.deleteIfExists as any).mock.calls.length).toBeGreaterThan(0);
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
    const { client } = createMockAzureClient(new Map([["uploads", createMockContainerClient(blobs)]]));
    const driver = new AzureBlobDriver(client, { container: "uploads" });

    await driver.copy("source.txt", "dest.txt", {});

    const copyCall = (destBlobClient.beginCopyFromURL as any).mock.calls[0];
    expect(copyCall).toBeTruthy();
    expect(copyCall[0]).toBe(sourceBlobClient.url);
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
    const { client } = createMockAzureClient(new Map([["uploads", createMockContainerClient(blobs)]]));
    const driver = new AzureBlobDriver(client, { container: "uploads" });

    await driver.move("source.txt", "dest.txt", {});

    expect((destBlobClient.beginCopyFromURL as any).mock.calls.length).toBeGreaterThan(0);
    expect((sourceBlobClient.deleteIfExists as any).mock.calls.length).toBeGreaterThan(0);
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
    const { client } = createMockAzureClient(new Map([["uploads", createMockContainerClient(new Map(), listItems)]]));
    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const files: any[] = [];
    for await (const file of driver.list("", {})) files.push(file);

    expect(files.length).toBe(2);
    expect(files[0]!.href).toContain("images/a.jpg");
    expect(files[0]!.size).toBe(100);
    expect(files[1]!.href).toContain("images/b.jpg");
  });

  test("respects limit option", async () => {
    const listItems = [
      { name: "a.txt", properties: { contentLength: 1, lastModified: new Date() } },
      { name: "b.txt", properties: { contentLength: 2, lastModified: new Date() } },
      { name: "c.txt", properties: { contentLength: 3, lastModified: new Date() } },
    ];
    const { client } = createMockAzureClient(new Map([["uploads", createMockContainerClient(new Map(), listItems)]]));
    const driver = new AzureBlobDriver(client, { container: "uploads" });

    const files: any[] = [];
    for await (const file of driver.list("", { limit: 2 })) files.push(file);

    expect(files.length).toBe(2);
  });

  test("throws when no container is given and none in config", async () => {
    const { client } = createMockAzureClient();
    const driver = new AzureBlobDriver(client, {});

    await expect(
      (async () => {
        for await (const _ of driver.list("", {})) {
          /* iterate */
        }
      })()
    ).rejects.toThrow(/Container must be specified/);
  });
});

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — metadata", () => {
  test("returns FileMetadata from getProperties", async () => {
    const { driver } = setup("data.bin", "data", {
      contentLength: 4,
      contentType: "application/octet-stream",
      lastModified: new Date(9_000_000),
      metadata: { tag: "production" },
    });

    const meta = await driver.metadata("data.bin", {});

    expect(meta).toBeTruthy();
    expect(meta!.href).toContain("data.bin");
    expect(meta!.size).toBe(4);
    expect(meta!.type).toBe("application/octet-stream");
    expect(meta!.metadata).toEqual({ tag: "production" });
  });

  test("returns null for 404 status", async () => {
    const { driver, blobClient } = setup("missing.bin");
    const err: any = Object.assign(new Error("BlobNotFound"), { statusCode: 404 });
    (blobClient.getProperties as any).mockRejectedValueOnce(err);
    expect(await driver.metadata("missing.bin", {})).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// url
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — url", () => {
  test("returns publicUrl + blob when publicUrl is configured", async () => {
    const { driver } = setup("images/photo.jpg", "img", {}, { publicUrl: "https://cdn.example.com" });
    expect(await driver.url("images/photo.jpg")).toBe("https://cdn.example.com/images/photo.jpg");
  });

  test("returns blobClient.url when no publicUrl", async () => {
    const { driver, blobClient } = setup("file.txt");
    const blobUrl = `${ENDPOINT}uploads/file.txt`;
    (blobClient as any).url = blobUrl;
    expect(await driver.url("file.txt")).toBe(blobUrl);
  });
});

// ---------------------------------------------------------------------------
// updateMetadata
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — updateMetadata", () => {
  test("updates metadata via setMetadata", async () => {
    const { driver, blobClient } = setup("file.txt", "content", {
      contentLength: 7,
      contentType: "text/plain",
      metadata: { old: "value" },
    });

    const result = await driver.updateMetadata("file.txt", { metadata: { new: "value" } });

    const setMetaCall = (blobClient.setMetadata as any).mock.calls[0];
    expect(setMetaCall).toBeTruthy();
    expect(setMetaCall[0]).toEqual({ new: "value" });
    expect(result.metadata).toEqual({ new: "value" });
  });

  test("updates content type via setHTTPHeaders", async () => {
    const { driver, blobClient } = setup("file.txt", "content", { contentLength: 7, contentType: "text/plain" });

    const result = await driver.updateMetadata("file.txt", { type: "application/json" });

    const setHeadersCall = (blobClient.setHTTPHeaders as any).mock.calls[0];
    expect(setHeadersCall).toBeTruthy();
    expect(setHeadersCall[0].blobContentType).toBe("application/json");
    expect(result.type).toBe("application/json");
  });

  test("can update both metadata and content type simultaneously", async () => {
    const { driver, blobClient } = setup("doc.txt", "x", { contentLength: 1, contentType: "text/plain" });

    await driver.updateMetadata("doc.txt", { type: "application/json", metadata: { env: "test" } });

    expect((blobClient.setMetadata as any).mock.calls.length).toBeGreaterThan(0);
    expect((blobClient.setHTTPHeaders as any).mock.calls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// createAzureBlobDriver factory
// ---------------------------------------------------------------------------

describe("createAzureBlobDriver factory", () => {
  test("accepts an existing BlobServiceClient", () => {
    const { client } = createMockAzureClient();
    expect(createAzureBlobDriver(client, { container: "uploads" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// blobToHref
// ---------------------------------------------------------------------------

describe("AzureBlobDriver — blobToHref", () => {
  test("constructed href includes endpoint + container + blob", async () => {
    const { driver } = setup("path/to/file.txt", "data", { contentLength: 4 }, { container: "mycontainer" });
    const meta = await driver.metadata("path/to/file.txt", {});

    expect(meta).toBeTruthy();
    expect(meta!.href).toMatch(new RegExp(`^${ENDPOINT}`));
    expect(meta!.href).toContain("mycontainer/path/to/file.txt");
  });
});
