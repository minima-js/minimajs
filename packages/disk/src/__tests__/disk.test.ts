import { describe, test, beforeEach, expect, afterEach } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDisk } from "../index.js";
import { createFsDriver } from "../adapters/index.js";
import { createMemoryDriver } from "../adapters/memory.js";

let rootDir: string;

beforeEach(async () => {
  rootDir = `file://${await mkdtemp(join(tmpdir(), "minimajs-disk-"))}/`;
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
    const stored = await disk.put("uploads/hello.txt", blob, { type: "text/plain" });

    expect(stored.href).toBe(`${rootDir}uploads/hello.txt`);
    expect(stored.type.startsWith("text/plain")).toBeTruthy();

    const result = await disk.get("uploads/hello.txt");
    expect(result).toBeTruthy();
    const text = await result!.text();
    expect(text).toBe("hello world");

    await disk.delete("uploads/hello.txt");
    const missing = await disk.get("uploads/hello.txt");
    expect(missing).toBe(null);
  });

  test("stores string data", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const stored = await disk.put("docs/readme.txt", "Hello from string");

    expect(stored.href.endsWith("docs/readme.txt")).toBeTruthy();
    const result = await disk.get("docs/readme.txt");
    expect(result).toBeTruthy();
    expect(await result!.text()).toBe("Hello from string");
  });

  test("stores ArrayBuffer data", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const data = new TextEncoder().encode("binary data");
    const stored = await disk.put("data/binary.bin", data);

    expect(stored.href.endsWith("data/binary.bin")).toBeTruthy();
    const result = await disk.get("data/binary.bin");
    expect(result).toBeTruthy();
    expect(await result!.text()).toBe("binary data");
  });

  test("checks file existence", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    expect(await disk.exists("missing.txt")).toBe(false);

    await disk.put("exists.txt", "content");
    expect(await disk.exists("exists.txt")).toBe(true);

    await disk.delete("exists.txt");
    expect(await disk.exists("exists.txt")).toBe(false);
  });

  test("generates public url", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir, publicUrl: "https://cdn.example.com" }),
    });

    await disk.put("images/photo.jpg", new Blob(["fake image"]));
    const url = await disk.url("images/photo.jpg");

    expect(url).toBe("https://cdn.example.com/images/photo.jpg");
  });

  test("throws when url called without publicUrl", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("file.txt", "content");
    await expect(disk.url("file.txt")).rejects.toThrow("publicUrl is required to generate a url");
  });

  test("blocks directory traversal in keys", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await expect(disk.put("../../../etc/passwd", "malicious")).rejects.toMatchObject({
      name: "DiskAccessError",
    });
  });

  test("stores with custom metadata", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const stored = await disk.put("file.txt", "content", {
      metadata: { userId: "123", category: "documents" },
    });

    expect(stored.metadata).toEqual({ userId: "123", category: "documents" });
  });

  test("copies a file", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("original.txt", "original content");
    const copied = await disk.copy("original.txt", "copied.txt");

    expect(copied.href.endsWith("copied.txt")).toBeTruthy();
    expect(await disk.exists("original.txt")).toBe(true);
    expect(await disk.exists("copied.txt")).toBe(true);

    const copiedContent = await disk.get("copied.txt");
    expect(await copiedContent?.text()).toBe("original content");
  });

  test("copies using DiskFile instance", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const original = await disk.put("original.txt", "original content");
    const copied = await disk.copy(original, "copied-from-file.txt");

    expect(copied.href.endsWith("copied-from-file.txt")).toBeTruthy();
    expect(await disk.exists("original.txt")).toBe(true);
    expect(await disk.exists("copied-from-file.txt")).toBe(true);
  });

  test("moves a file", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("source.txt", "source content");
    const moved = await disk.move("source.txt", "destination.txt");

    expect(moved.href.endsWith("destination.txt")).toBeTruthy();
    expect(await disk.exists("source.txt")).toBe(false);
    expect(await disk.exists("destination.txt")).toBe(true);

    const movedContent = await disk.get("destination.txt");
    expect(await movedContent?.text()).toBe("source content");
  });

  test("moves using DiskFile instance", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const source = await disk.put("source.txt", "source content");
    const moved = await disk.move(source, "moved-from-file.txt");

    expect(moved.href.endsWith("moved-from-file.txt")).toBeTruthy();
    expect(await disk.exists("source.txt")).toBe(false);
    expect(await disk.exists("moved-from-file.txt")).toBe(true);
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
      files.push(file.href);
    }

    expect(files.length).toBe(2);
    expect(files.some((f) => f.endsWith("images/a.jpg"))).toBeTruthy();
    expect(files.some((f) => f.endsWith("images/b.jpg"))).toBeTruthy();
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
      files.push(file.href);
    }

    expect(files.length).toBe(3);
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
      files.push(file.href);
    }

    expect(files.length).toBe(2);
  });

  test("gets file metadata", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    await disk.put("meta.txt", "some content");
    const metadata = (await disk.metadata("meta.txt"))!;

    expect(metadata).toBeTruthy();
    expect(metadata.href.endsWith("meta.txt")).toBeTruthy();
    expect(metadata.size).toBe(12); // "some content" = 12 bytes
    expect(metadata.lastModified).not.toBeNaN();
  });

  test("returns null for missing file metadata", async () => {
    const disk = createDisk({
      driver: createFsDriver({ root: rootDir }),
    });

    const metadata = await disk.metadata("nonexistent.txt");
    expect(metadata).toBe(null);
  });
});

describe("disk memory driver", () => {
  test("stores and retrieves data", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    const stored = await disk.put("test.txt", "hello memory");
    expect(stored.href.includes("test.txt")).toBeTruthy();

    const result = await disk.get("test.txt");
    expect(result).toBeTruthy();
    expect(await result!.text()).toBe("hello memory");

    driver.clear();
  });

  test("copies and moves files", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await disk.put("original.txt", "content");

    await disk.copy("original.txt", "copy.txt");
    expect(await disk.exists("original.txt")).toBe(true);
    expect(await disk.exists("copy.txt")).toBe(true);

    await disk.move("copy.txt", "moved.txt");
    expect(await disk.exists("copy.txt")).toBe(false);
    expect(await disk.exists("moved.txt")).toBe(true);

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
      files.push(file.href);
    }

    expect(files.length).toBe(2);
    driver.clear();
  });

  test("gets metadata with content type", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await disk.put("file.json", '{"key": "value"}', { type: "application/json" });
    const metadata = (await disk.metadata("file.json"))!;

    expect(metadata).toBeTruthy();
    expect(metadata.type).toBe("application/json");
    expect(metadata.size).toBe(16);

    driver.clear();
  });

  test("throws on copy/move missing file", async () => {
    const driver = createMemoryDriver();
    const disk = createDisk({ driver });

    await expect(disk.copy("missing.txt", "dest.txt")).rejects.toMatchObject({
      name: "DiskFileNotFoundError",
    });

    await expect(disk.move("missing.txt", "dest.txt")).rejects.toMatchObject({
      name: "DiskFileNotFoundError",
    });
  });
});
