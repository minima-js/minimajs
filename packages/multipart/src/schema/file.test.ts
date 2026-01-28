import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pipeline } from "node:stream/promises";
import { TempFile, isUploadedFile } from "./file.js";

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
    const uploadedFile = new TempFile("test.pdf", {
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
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });
    const stream = uploadedFile.stream();

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(Buffer.concat(chunks).toString()).toBe("Test content");
  });

  test("nodeStream() should create multiple independent streams", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    const stream1 = uploadedFile.toReadable();
    const stream2 = uploadedFile.toReadable();

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
    const uploadedFile = new TempFile("test.txt", {
      path: testFile,
      size: 12,
      signal: abortController.signal,
    });

    const stream = uploadedFile.toReadable();
    abortController.abort();

    await expect(new Promise((_, reject) => stream.on("error", reject))).rejects.toThrow();
  });

  test("arrayBuffer() should read file into ArrayBuffer", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });
    const buffer = await uploadedFile.arrayBuffer();

    expect(Buffer.from(buffer).toString()).toBe("Test content");
  });

  test("text() should read file as string", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });
    const text = await uploadedFile.text();

    expect(text).toBe("Test content");
  });

  test("slice() should throw error", () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    expect(() => uploadedFile.slice()).toThrow("UploadedFile.slice() is not supported");
  });

  test("destroy() should destroy inactive streams and delete file", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    // Create streams but don't consume them (inactive)
    const stream1 = uploadedFile.toReadable();
    const stream2 = uploadedFile.toReadable();

    const result = await uploadedFile.destroy();

    expect(result).toBe(true);
    expect(stream1.destroyed).toBe(true);
    expect(stream2.destroyed).toBe(true);
    await expect(readFile(testFile)).rejects.toThrow();
  });

  test("destroy() should wait for active streams to finish before deleting", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    const outputFile = join(testDir, "output.txt");
    const stream = uploadedFile.toReadable();

    // Start consuming the stream (makes it active)
    const pipePromise = pipeline(stream, createWriteStream(outputFile));

    // Call destroy while stream is active
    const destroyPromise = uploadedFile.destroy();

    // Stream should NOT be destroyed while active
    expect(stream.destroyed).toBe(false);

    // Wait for both to complete
    await pipePromise;
    const result = await destroyPromise;

    expect(result).toBe(true);
    // File should be deleted after stream finished
    await expect(readFile(testFile)).rejects.toThrow();
    // Output file should have the content (stream completed successfully)
    expect(await readFile(outputFile, "utf8")).toBe("Test content");
  });

  test("destroy() should handle mixed active and inactive streams", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    // Inactive stream
    const inactiveStream = uploadedFile.toReadable();

    // Active stream (being consumed)
    const activeStream = uploadedFile.toReadable();
    const chunks: Buffer[] = [];
    activeStream.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Small delay to ensure stream starts flowing
    await new Promise((resolve) => setImmediate(resolve));

    const result = await uploadedFile.destroy();

    expect(result).toBe(true);
    expect(inactiveStream.destroyed).toBe(true);
    // Active stream should have completed naturally
    expect(Buffer.concat(chunks).toString()).toBe("Test content");
  });

  test("destroy() should return false if file doesn't exist", async () => {
    const nonExistentFile = join(testDir, "non-existent.txt");
    const uploadedFile = new TempFile("test.txt", { path: nonExistentFile, size: 0 });

    const result = await uploadedFile.destroy();
    expect(result).toBe(false);
  });

  test("destroy() should return true even if active stream errors", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    const stream = uploadedFile.toReadable();
    // Start consuming to make active
    stream.on("data", () => {});
    await new Promise((resolve) => setImmediate(resolve));

    // Manually destroy stream with error
    stream.destroy(new Error("Test error"));

    const result = await uploadedFile.destroy();
    expect(result).toBe(true);
  });

  test("toFile() should return a standard File with data loaded", async () => {
    const uploadedFile = new TempFile("test.txt", {
      path: testFile,
      size: 12,
      type: "text/plain",
    });

    const file = await uploadedFile.toFile();

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("test.txt");
    expect(file.type).toContain("text/plain");
    expect(await file.text()).toBe("Test content");
  });

  test("streams should be removed from tracking after close", async () => {
    const uploadedFile = new TempFile("test.txt", { path: testFile, size: 12 });

    const stream = uploadedFile.toReadable();

    // Consume stream to completion
    for await (const _ of stream) {
      // drain
    }

    // Stream should be closed and removed from tracking
    // Calling destroy should just delete the file (no streams to handle)
    const result = await uploadedFile.destroy();
    expect(result).toBe(true);
  });
});

describe("isUploadedFile", () => {
  test("should return true for UploadedFile instances", () => {
    const uploadedFile = new TempFile("test.txt", { path: "/tmp/test.txt", size: 10 });
    expect(isUploadedFile(uploadedFile)).toBe(true);
  });

  test("should return false for non-UploadedFile objects", () => {
    expect(isUploadedFile(new File([], "test.txt"))).toBe(false);
    expect(isUploadedFile({})).toBe(false);
    expect(isUploadedFile(null)).toBe(false);
    expect(isUploadedFile(undefined)).toBe(false);
  });
});
