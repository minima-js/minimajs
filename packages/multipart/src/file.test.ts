import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { Readable } from "node:stream";
import { File, isFile } from "./file.js";
import { rm, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("File", () => {
  const testDir = join(tmpdir(), "minimajs-file-tests");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("should create a File instance with all properties", () => {
      const stream = Readable.from(["test"]);
      const file = new File("avatar", "profile.png", "7bit", "image/png", stream);

      expect(file.field).toBe("avatar");
      expect(file.filename).toBe("profile.png");
      expect(file.encoding).toBe("7bit");
      expect(file.mimeType).toBe("image/png");
    });

    test("should work without stream parameter", () => {
      const file = new File("avatar", "profile.png", "7bit", "image/png");

      expect(file.field).toBe("avatar");
      expect(file.filename).toBe("profile.png");
    });
  });

  describe("ext", () => {
    test("should return file extension with dot", () => {
      const stream = Readable.from(["test"]);
      const file = new File("doc", "report.pdf", "7bit", "application/pdf", stream);

      expect(file.ext).toBe(".pdf");
    });

    test("should return extension for multi-dot filenames", () => {
      const stream = Readable.from(["test"]);
      const file = new File("archive", "data.tar.gz", "7bit", "application/gzip", stream);

      expect(file.ext).toBe(".gz");
    });

    test("should return empty string for files without extension", () => {
      const stream = Readable.from(["test"]);
      const file = new File("readme", "README", "7bit", "text/plain", stream);

      expect(file.ext).toBe("");
    });

    test("should cache the extension value", () => {
      const stream = Readable.from(["test"]);
      const file = new File("doc", "report.pdf", "7bit", "application/pdf", stream);

      const ext1 = file.ext;
      const ext2 = file.ext;

      expect(ext1).toBe(ext2);
      expect(ext1).toBe(".pdf");
    });
  });

  describe("randomName", () => {
    test("should generate a UUID-based filename with original extension", () => {
      const stream = Readable.from(["test"]);
      const file = new File("avatar", "profile.png", "7bit", "image/png", stream);

      const randomName = file.randomName;

      expect(randomName).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);
    });

    test("should cache the random name", () => {
      const stream = Readable.from(["test"]);
      const file = new File("avatar", "profile.png", "7bit", "image/png", stream);

      const name1 = file.randomName;
      const name2 = file.randomName;

      expect(name1).toBe(name2);
    });

    test("should preserve extension from original filename", () => {
      const stream = Readable.from(["test"]);
      const file = new File("doc", "report.pdf", "7bit", "application/pdf", stream);

      expect(file.randomName).toMatch(/\.pdf$/);
    });
  });

  describe("create", () => {
    test("should create File instance from FileInfo", () => {
      const stream = Readable.from(["test"]);
      const info = {
        field: "avatar",
        filename: "profile.png",
        encoding: "7bit",
        mimeType: "image/png",
        stream,
      };

      const file = File.create(info, null);

      expect(file).toBeInstanceOf(File);
      expect(file.field).toBe("avatar");
      expect(file.filename).toBe("profile.png");
      expect(file.encoding).toBe("7bit");
      expect(file.mimeType).toBe("image/png");
    });
  });

  describe("stream", () => {
    test("should return the stream when available", () => {
      const stream = Readable.from(["test"]);
      const file = new File("avatar", "profile.png", "7bit", "image/png", stream);

      expect(file.stream).toBe(stream);
    });

    test("should throw when stream is not available", () => {
      const file = new File("avatar", "profile.png", "7bit", "image/png");

      expect(() => file.stream).toThrow("stream is empty");
    });
  });

  describe("buffer", () => {
    test("should convert stream to buffer", async () => {
      const content = "Hello, World!";
      const stream = Readable.from([content]);
      const file = new File("doc", "hello.txt", "7bit", "text/plain", stream);

      const buffer = await file.buffer();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe(content);
    });

    test("should cache the buffer", async () => {
      const content = "Hello, World!";
      const stream = Readable.from([content]);
      const file = new File("doc", "hello.txt", "7bit", "text/plain", stream);

      const buffer1 = await file.buffer();
      const buffer2 = await file.buffer();

      expect(buffer1).toBe(buffer2);
    });

    test("should handle binary data", async () => {
      const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
      const stream = Readable.from([data]);
      const file = new File("image", "test.png", "binary", "image/png", stream);

      const buffer = await file.buffer();

      expect(buffer).toEqual(data);
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);
      const file = new File("doc", "empty.txt", "7bit", "text/plain", stream);

      const buffer = await file.buffer();

      expect(buffer.length).toBe(0);
    });
  });

  describe("move", () => {
    test("should move file to specified directory with custom filename", async () => {
      const content = "Test content";
      const stream = Readable.from([content]);
      const file = new File("doc", "test.txt", "7bit", "text/plain", stream);

      const filename = await file.move(testDir, "custom.txt");

      expect(filename).toBe("custom.txt");

      const savedContent = await readFile(join(testDir, filename), "utf-8");
      expect(savedContent).toBe(content);
    });

    test("should use random name when filename not provided", async () => {
      const content = "Test content";
      const stream = Readable.from([content]);
      const file = new File("doc", "test.txt", "7bit", "text/plain", stream);

      const filename = await file.move(testDir);

      expect(filename).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.txt$/);

      const savedContent = await readFile(join(testDir, filename), "utf-8");
      expect(savedContent).toBe(content);
    });

    test("should use current working directory when dir not provided", async () => {
      const content = "Test content";
      const stream = Readable.from([content]);
      const file = new File("doc", "test.txt", "7bit", "text/plain", stream);
      const filename = "test-move-default.txt";

      await file.move(undefined, filename);

      const savedPath = join(process.cwd(), filename);
      const savedContent = await readFile(savedPath, "utf-8");
      expect(savedContent).toBe(content);

      // Cleanup
      await rm(savedPath, { force: true });
    });

    test("should handle binary file move", async () => {
      const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const stream = Readable.from([data]);
      const file = new File("image", "test.png", "binary", "image/png", stream);

      const filename = await file.move(testDir, "image.png");

      const savedData = await readFile(join(testDir, filename));
      expect(savedData).toEqual(data);
    });
  });

  describe("flush", () => {
    test("should consume the stream without storing data", async () => {
      const content = "This should be discarded";
      const stream = Readable.from([content]);
      const file = new File("doc", "discard.txt", "7bit", "text/plain", stream);

      await expect(file.flush()).resolves.toBeUndefined();

      // Verify stream was consumed
      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBe(0);
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);
      const file = new File("doc", "empty.txt", "7bit", "text/plain", stream);

      await expect(file.flush()).resolves.toBeUndefined();
    });

    test("should handle large streams efficiently", async () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const stream = Readable.from([largeContent]);
      const file = new File("doc", "large.txt", "7bit", "text/plain", stream);

      const startTime = Date.now();
      await file.flush();
      const duration = Date.now() - startTime;

      // Should complete reasonably fast
      expect(duration).toBeLessThan(1000);
    });
  });
});

describe("isFile", () => {
  test("should return true for File instances", () => {
    const stream = Readable.from(["test"]);
    const file = new File("avatar", "profile.png", "7bit", "image/png", stream);

    expect(isFile(file)).toBe(true);
  });

  test("should return false for non-File objects", () => {
    expect(isFile({})).toBe(false);
    expect(isFile(null)).toBe(false);
    expect(isFile(undefined)).toBe(false);
    expect(isFile("string")).toBe(false);
    expect(isFile(123)).toBe(false);
    expect(isFile([])).toBe(false);
  });

  test("should return false for File-like objects", () => {
    const fakefile = {
      field: "avatar",
      filename: "profile.png",
      encoding: "7bit",
      mimeType: "image/png",
      stream: Readable.from(["test"]),
    };

    expect(isFile(fakefile)).toBe(false);
  });
});
