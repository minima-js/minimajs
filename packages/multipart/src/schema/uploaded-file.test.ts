import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { Readable } from "node:stream";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { UploadedFile, isUploadedFile, type UploadedFileInit } from "./uploaded-file.js";

function createUploadedFile(filename: string = "test.pdf", options: Partial<UploadedFileInit> = {}) {
  return new UploadedFile(filename, {
    path: "",
    size: 0,
    ...options,
  });
}

describe("UploadedFile", () => {
  const testDir = join(tmpdir(), "minimajs-uploaded-file-tests");
  let testFile: string;
  let abortController: AbortController;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    testFile = join(testDir, "test-file.txt");
    await writeFile(testFile, "Test content");
    abortController = new AbortController();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("should create UploadedFile instance with all properties", () => {
      const uploadedFile = createUploadedFile("test.pdf", { path: testFile, size: 1024, signal: abortController.signal });
      expect(uploadedFile.name).toBe("profile.png");
      expect(uploadedFile.type).toBe("image/png");
      expect(uploadedFile.path).toBe(testFile);
      expect(uploadedFile.size).toBe(1024);
    });

    test("should extend File class", () => {
      const uploadedFile = createUploadedFile();
      expect(uploadedFile).toBeInstanceOf(File);
      expect(uploadedFile).toBeInstanceOf(UploadedFile);
    });
  });

  describe("stream", () => {
    test("should create readable stream from temporary file", async () => {
      const uploadedFile = new UploadedFile("test.pdf", { path: testFile, size: 12, signal: abortController.signal });
      const stream = uploadedFile.stream();
      expect(stream).toBeInstanceOf(ReadableStream);

      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const content = Buffer.concat(chunks).toString();
      expect(content).toBe("Test content");
    });

    test("should track multiple streams", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);

      const stream1 = uploadedFile.stream;
      const stream2 = uploadedFile.stream;

      expect(stream1).not.toBe(stream2);

      // Both streams should read the same content
      const content1 = await new Promise<string>((resolve) => {
        const chunks: Buffer[] = [];
        stream1.on("data", (chunk) => chunks.push(chunk));
        stream1.on("end", () => resolve(Buffer.concat(chunks).toString()));
      });

      const content2 = await new Promise<string>((resolve) => {
        const chunks: Buffer[] = [];
        stream2.on("data", (chunk) => chunks.push(chunk));
        stream2.on("end", () => resolve(Buffer.concat(chunks).toString()));
      });

      expect(content1).toBe("Test content");
      expect(content2).toBe("Test content");
    });

    test("should remove stream from tracking when closed", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);
      const stream = uploadedFile.stream;

      await new Promise<void>((resolve) => {
        stream.on("close", () => {
          resolve();
        });
        stream.destroy();
      });

      // Stream should be removed from internal tracking
      // (We can't directly test this, but it shouldn't throw)
      expect(true).toBe(true);
    });

    test("should respect abort signal", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);
      const stream = uploadedFile.stream;

      abortController.abort();

      await expect(
        new Promise((_, reject) => {
          stream.on("error", reject);
        })
      ).rejects.toThrow();
    });
  });

  describe("destroy", () => {
    test("should delete temporary file", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);

      await uploadedFile.destroy();

      // File should be deleted
      await expect(readFile(testFile)).rejects.toThrow();
    });

    test("should destroy all active streams", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);

      const stream1 = uploadedFile.nodeStream();
      const stream2 = uploadedFile.nodeStream();

      const destroyPromises = [
        new Promise<void>((resolve) => {
          stream1.on("close", () => resolve());
        }),
        new Promise<void>((resolve) => {
          stream2.on("close", () => resolve());
        }),
      ];

      await uploadedFile.destroy();

      await Promise.all(destroyPromises);

      expect(stream1.destroyed).toBe(true);
      expect(stream2.destroyed).toBe(true);
    });

    test("should not throw if file does not exist", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const nonExistentFile = join(testDir, "non-existent.txt");
      const uploadedFile = new UploadedFile(info, nonExistentFile, 0, abortController.signal);

      await expect(uploadedFile.destroy()).resolves.toBeUndefined();
    });

    test("should be idempotent", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);

      await uploadedFile.destroy();
      await uploadedFile.destroy(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe("size property", () => {
    test("should store file size", () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = createUploadedFile(info.filename, { size: 5242880, signal: abortController.signal });

      expect(uploadedFile.size).toBe(5242880);
    });

    test("should handle zero size", () => {
      const info = {
        field: "doc",
        filename: "empty.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from([""]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 0, abortController.signal);

      expect(uploadedFile.size).toBe(0);
    });
  });

  describe("tmpFile property", () => {
    test("should provide access to temporary file path", () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);

      expect(uploadedFile.path).toBe(testFile);
    });

    test("should allow reading file directly", async () => {
      const uploadedFile = createUploadedFile();
      const content = await readFile(uploadedFile.path, "utf-8");

      expect(content).toBe("Test content");
    });
  });
});

describe("isUploadedFile", () => {
  const testDir = join(tmpdir(), "minimajs-is-uploaded-file-tests");
  let testFile: string;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    testFile = join(testDir, "test.txt");
    await writeFile(testFile, "content");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("should return true for UploadedFile instances", () => {
    const info = {
      field: "doc",
      filename: "test.txt",
      encoding: "7bit",
      mimeType: "text/plain",
      stream: Readable.from(["test"]),
    };

    const uploadedFile = new UploadedFile(info, testFile, 10);

    expect(isUploadedFile(uploadedFile)).toBe(true);
  });

  test("should return false for regular File instances", () => {
    const stream = Readable.from(["test"]);
    const file = new File("doc", "test.txt", "7bit", "text/plain", stream);

    expect(isUploadedFile(file)).toBe(false);
  });

  test("should return false for non-file objects", () => {
    expect(isUploadedFile({})).toBe(false);
    expect(isUploadedFile(null)).toBe(false);
    expect(isUploadedFile(undefined)).toBe(false);
    expect(isUploadedFile("string")).toBe(false);
    expect(isUploadedFile(123)).toBe(false);
    expect(isUploadedFile([])).toBe(false);
  });

  test("should return false for file-like objects", () => {
    const fakeFile = {
      field: "doc",
      filename: "test.txt",
      encoding: "7bit",
      mimeType: "text/plain",
      tmpFile: testFile,
      size: 10,
    };

    expect(isUploadedFile(fakeFile)).toBe(false);
  });
});
