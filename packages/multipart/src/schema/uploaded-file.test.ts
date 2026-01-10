import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { Readable } from "node:stream";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { UploadedFile, isUploadedFile } from "./uploaded-file.js";
import { File } from "../file.js";

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
      const info = {
        field: "avatar",
        filename: "profile.png",
        encoding: "7bit",
        mimeType: "image/png",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 1024, abortController.signal);

      expect(uploadedFile.field).toBe("avatar");
      expect(uploadedFile.filename).toBe("profile.png");
      expect(uploadedFile.encoding).toBe("7bit");
      expect(uploadedFile.mimeType).toBe("image/png");
      expect(uploadedFile.tmpFile).toBe(testFile);
      expect(uploadedFile.size).toBe(1024);
    });

    test("should extend File class", () => {
      const info = {
        field: "doc",
        filename: "test.pdf",
        encoding: "7bit",
        mimeType: "application/pdf",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 500, abortController.signal);

      expect(uploadedFile).toBeInstanceOf(File);
      expect(uploadedFile).toBeInstanceOf(UploadedFile);
    });

    test("should work without signal parameter", () => {
      const info = {
        field: "doc",
        filename: "test.pdf",
        encoding: "7bit",
        mimeType: "application/pdf",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 500);

      expect(uploadedFile.tmpFile).toBe(testFile);
    });
  });

  describe("stream", () => {
    test("should create readable stream from temporary file", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);
      const stream = uploadedFile.stream;

      expect(stream).toBeInstanceOf(Readable);

      const chunks: Buffer[] = [];
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

      const stream1 = uploadedFile.stream;
      const stream2 = uploadedFile.stream;

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

  describe("inherited File properties", () => {
    test("should have ext property", () => {
      const info = {
        field: "doc",
        filename: "report.pdf",
        encoding: "7bit",
        mimeType: "application/pdf",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 1024, abortController.signal);

      expect(uploadedFile.ext).toBe(".pdf");
    });

    test("should have randomName property", () => {
      const info = {
        field: "image",
        filename: "photo.jpg",
        encoding: "7bit",
        mimeType: "image/jpeg",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 2048, abortController.signal);

      expect(uploadedFile.randomName).toMatch(/^[0-9a-f-]+\.jpg$/);
    });

    test("should support move method", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);
      const destFile = await uploadedFile.move(testDir, "moved.txt");

      expect(destFile).toBe("moved.txt");

      const content = await readFile(join(testDir, destFile), "utf-8");
      expect(content).toBe("Test content");
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

      const uploadedFile = new UploadedFile(info, testFile, 5242880, abortController.signal);

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

      expect(uploadedFile.tmpFile).toBe(testFile);
    });

    test("should allow reading file directly", async () => {
      const info = {
        field: "doc",
        filename: "test.txt",
        encoding: "7bit",
        mimeType: "text/plain",
        stream: Readable.from(["test"]),
      };

      const uploadedFile = new UploadedFile(info, testFile, 12, abortController.signal);
      const content = await readFile(uploadedFile.tmpFile, "utf-8");

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
