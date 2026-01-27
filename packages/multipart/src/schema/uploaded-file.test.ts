import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { UploadedFile, isUploadedFile } from "./uploaded-file.js";

describe("UploadedFile", () => {
  const testDir = join(tmpdir(), "minimajs-uploaded-file-tests");
  let testFile: string;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    testFile = join(testDir, "test-file.txt");
    await writeFile(testFile, "Test content");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("should store properties correctly", () => {
    const uploadedFile = new UploadedFile("test.pdf", {
      path: testFile,
      size: 1024,
      type: "application/pdf",
    });

    expect(uploadedFile.name).toBe("test.pdf");
    expect(uploadedFile.type).toBe("application/pdf");
    expect(uploadedFile.path).toBe(testFile);
    expect(uploadedFile.size).toBe(1024);
  });

  test("stream() should create ReadableStream from file", async () => {
    const uploadedFile = new UploadedFile("test.txt", { path: testFile, size: 12 });
    const stream = uploadedFile.stream();

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(Buffer.concat(chunks).toString()).toBe("Test content");
  });

  test("nodeStream() should create multiple independent streams", async () => {
    const uploadedFile = new UploadedFile("test.txt", { path: testFile, size: 12 });

    const stream1 = uploadedFile.nodeStream();
    const stream2 = uploadedFile.nodeStream();

    const readStream = (stream: any) =>
      new Promise<string>((resolve) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
      });

    const [content1, content2] = await Promise.all([readStream(stream1), readStream(stream2)]);

    expect(content1).toBe("Test content");
    expect(content2).toBe("Test content");
  });

  test("nodeStream() should respect abort signal", async () => {
    const abortController = new AbortController();
    const uploadedFile = new UploadedFile("test.txt", {
      path: testFile,
      size: 12,
      signal: abortController.signal,
    });

    const stream = uploadedFile.nodeStream();
    abortController.abort();

    await expect(new Promise((_, reject) => stream.on("error", reject))).rejects.toThrow();
  });

  test("arrayBuffer() should read file into ArrayBuffer", async () => {
    const uploadedFile = new UploadedFile("test.txt", { path: testFile, size: 12 });
    const buffer = await uploadedFile.arrayBuffer();

    expect(Buffer.from(buffer).toString()).toBe("Test content");
  });

  test("text() should read file as string", async () => {
    const uploadedFile = new UploadedFile("test.txt", { path: testFile, size: 12 });
    const text = await uploadedFile.text();

    expect(text).toBe("Test content");
  });

  test("slice() should throw error", () => {
    const uploadedFile = new UploadedFile("test.txt", { path: testFile, size: 12 });

    expect(() => uploadedFile.slice()).toThrow("UploadedFile.slice() is not supported");
  });

  test("destroy() should delete file and destroy streams", async () => {
    const uploadedFile = new UploadedFile("test.txt", { path: testFile, size: 12 });

    const stream1 = uploadedFile.nodeStream();
    const stream2 = uploadedFile.nodeStream();

    await uploadedFile.destroy();

    expect(stream1.destroyed).toBe(true);
    expect(stream2.destroyed).toBe(true);
    await expect(readFile(testFile)).rejects.toThrow();
  });

  test("destroy() should not throw if file doesn't exist", async () => {
    const nonExistentFile = join(testDir, "non-existent.txt");
    const uploadedFile = new UploadedFile("test.txt", { path: nonExistentFile, size: 0 });

    await expect(uploadedFile.destroy()).resolves.toBe(false);
  });
});

describe("isUploadedFile", () => {
  test("should return true for UploadedFile instances", () => {
    const uploadedFile = new UploadedFile("test.txt", { path: "/tmp/test.txt", size: 10 });
    expect(isUploadedFile(uploadedFile)).toBe(true);
  });

  test("should return false for non-UploadedFile objects", () => {
    expect(isUploadedFile(new File([], "test.txt"))).toBe(false);
    expect(isUploadedFile({})).toBe(false);
    expect(isUploadedFile(null)).toBe(false);
    expect(isUploadedFile(undefined)).toBe(false);
  });
});
