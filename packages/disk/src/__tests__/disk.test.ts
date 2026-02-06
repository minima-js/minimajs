import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDisk } from "../index.js";
import { createFsDriver } from "../adapters/fs.js";

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), "minimajs-disk-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("disk fs driver", () => {
  test("stores and retrieves a blob", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const blob = new Blob(["hello world"], { type: "text/plain" });
    const stored = await disk.put("uploads/hello.txt", blob, { contentType: "text/plain" });

    assert.equal(stored.key, "uploads/hello.txt");
    assert.ok(stored.type.startsWith("text/plain"));

    const result = await disk.get(stored.key);
    assert.ok(result);
    const text = await result.text();
    assert.equal(text, "hello world");

    await disk.delete(stored.key);
    const missing = await disk.get(stored.key);
    assert.equal(missing, null);
  });

  test("stores string data", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const stored = await disk.put("docs/readme.txt", "Hello from string");

    assert.equal(stored.key, "docs/readme.txt");
    const result = await disk.get(stored.key);
    assert.ok(result);
    assert.equal(await result.text(), "Hello from string");
  });

  test("stores ArrayBuffer data", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const data = new TextEncoder().encode("binary data");
    const stored = await disk.put("data/binary.bin", data);

    assert.equal(stored.key, "data/binary.bin");
    const result = await disk.get(stored.key);
    assert.ok(result);
    assert.equal(await result.text(), "binary data");
  });

  test("checks file existence", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    assert.equal(await disk.exists("missing.txt"), false);

    await disk.put("exists.txt", "content");
    assert.equal(await disk.exists("exists.txt"), true);

    await disk.delete("exists.txt");
    assert.equal(await disk.exists("exists.txt"), false);
  });

  test("generates public url", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir, publicUrl: "https://cdn.example.com" }),
    });

    await disk.put("images/photo.jpg", new Blob(["fake image"]));
    const url = await disk.url("images/photo.jpg");

    assert.equal(url, "https://cdn.example.com/images/photo.jpg");
  });

  test("throws when url called without publicUrl", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("file.txt", "content");
    await assert.rejects(() => disk.url("file.txt"), {
      message: "publicUrl is required to generate a url",
    });
  });

  test("sanitizes directory traversal in keys", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const stored = await disk.put("../../../etc/passwd", "malicious");
    assert.equal(stored.key, "etc/passwd");
  });

  test("stores with custom metadata", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const stored = await disk.put("file.txt", "content", {
      metadata: { userId: "123", category: "documents" },
    });

    assert.deepEqual(stored.metadata, { userId: "123", category: "documents" });
  });
});
