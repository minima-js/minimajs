import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDisk } from "../index.js";
import { createFsDriver } from "../adapters/fs.js";
import { createMemoryDriver } from "../adapters/memory.js";

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

  test("copies a file", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("original.txt", "original content");
    const copied = await disk.copy("original.txt", "copied.txt");

    assert.equal(copied.key, "copied.txt");
    assert.equal(await disk.exists("original.txt"), true);
    assert.equal(await disk.exists("copied.txt"), true);

    const copiedContent = await disk.get("copied.txt");
    assert.equal(await copiedContent?.text(), "original content");
  });

  test("copies using DiskFile instance", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const original = await disk.put("original.txt", "original content");
    const copied = await disk.copy(original, "copied-from-file.txt");

    assert.equal(copied.key, "copied-from-file.txt");
    assert.equal(await disk.exists("original.txt"), true);
    assert.equal(await disk.exists("copied-from-file.txt"), true);
  });

  test("moves a file", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("source.txt", "source content");
    const moved = await disk.move("source.txt", "destination.txt");

    assert.equal(moved.key, "destination.txt");
    assert.equal(await disk.exists("source.txt"), false);
    assert.equal(await disk.exists("destination.txt"), true);

    const movedContent = await disk.get("destination.txt");
    assert.equal(await movedContent?.text(), "source content");
  });

  test("moves using DiskFile instance", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const source = await disk.put("source.txt", "source content");
    const moved = await disk.move(source, "moved-from-file.txt");

    assert.equal(moved.key, "moved-from-file.txt");
    assert.equal(await disk.exists("source.txt"), false);
    assert.equal(await disk.exists("moved-from-file.txt"), true);
  });

  test("lists files with prefix", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("images/a.jpg", "a");
    await disk.put("images/b.jpg", "b");
    await disk.put("docs/readme.txt", "readme");

    const files: string[] = [];
    for await (const file of disk.list("images")) {
      files.push(file.key);
    }

    assert.equal(files.length, 2);
    assert.ok(files.includes("images/a.jpg"));
    assert.ok(files.includes("images/b.jpg"));
  });

  test("lists all files", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("file1.txt", "1");
    await disk.put("folder/file2.txt", "2");
    await disk.put("folder/sub/file3.txt", "3");

    const files: string[] = [];
    for await (const file of disk.list()) {
      files.push(file.key);
    }

    assert.equal(files.length, 3);
  });

  test("lists with limit", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("a.txt", "a");
    await disk.put("b.txt", "b");
    await disk.put("c.txt", "c");

    const files: string[] = [];
    for await (const file of disk.list(undefined, { limit: 2 })) {
      files.push(file.key);
    }

    assert.equal(files.length, 2);
  });

  test("gets file metadata", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("meta.txt", "some content");
    const metadata = await disk.getMetadata("meta.txt");

    assert.ok(metadata);
    assert.equal(metadata.key, "meta.txt");
    assert.equal(metadata.size, 12); // "some content" = 12 bytes
    assert.ok(metadata.lastModified instanceof Date);
  });

  test("returns null for missing file metadata", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const metadata = await disk.getMetadata("nonexistent.txt");
    assert.equal(metadata, null);
  });
});

describe("disk memory driver", () => {
  test("stores and retrieves data", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    const stored = await disk.put("test.txt", "hello memory");
    assert.equal(stored.key, "test.txt");

    const result = await disk.get("test.txt");
    assert.ok(result);
    assert.equal(await result.text(), "hello memory");

    driver.clear();
  });

  test("copies and moves files", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await disk.put("original.txt", "content");

    await disk.copy("original.txt", "copy.txt");
    assert.equal(await disk.exists("original.txt"), true);
    assert.equal(await disk.exists("copy.txt"), true);

    await disk.move("copy.txt", "moved.txt");
    assert.equal(await disk.exists("copy.txt"), false);
    assert.equal(await disk.exists("moved.txt"), true);

    driver.clear();
  });

  test("lists files with prefix", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await disk.put("images/a.png", "a");
    await disk.put("images/b.png", "b");
    await disk.put("docs/c.txt", "c");

    const files: string[] = [];
    for await (const file of disk.list("images/")) {
      files.push(file.key);
    }

    assert.equal(files.length, 2);
    driver.clear();
  });

  test("gets metadata with content type", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await disk.put("file.json", '{"key": "value"}', { contentType: "application/json" });
    const metadata = await disk.getMetadata("file.json");

    assert.ok(metadata);
    assert.equal(metadata.contentType, "application/json");
    assert.equal(metadata.size, 16);

    driver.clear();
  });

  test("throws on copy/move missing file", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await assert.rejects(() => disk.copy("missing.txt", "dest.txt"), {
      message: "File not found: missing.txt",
    });

    await assert.rejects(() => disk.move("missing.txt", "dest.txt"), {
      message: "File not found: missing.txt",
    });
  });
});
