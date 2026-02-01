import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import {
  humanFileSize,
  units,
  ensurePath,
  stream2void,
  stream2buffer,
  isFile,
  isRawFile,
  isRawField,
  raw2file,
  raw2streamFile,
  randomName,
  save,
  drain,
  stream2uint8array,
} from "./helpers.js";
import { mkdir, rm, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { RAW_FILE, RAW_FIELD } from "./raw/index.js";
import type { MultipartRawFile } from "./types.js";

function createRawFile(
  overrides: Partial<Omit<MultipartRawFile, "stream">> & { content?: string | Buffer } = {}
): MultipartRawFile {
  const { content = "", ...rest } = overrides;
  const buffer = typeof content === "string" ? Buffer.from(content) : content;
  const stream = Object.assign(Readable.from([buffer]), { truncated: false, bytesRead: buffer.length });
  return {
    [RAW_FILE]: true,
    fieldname: "file",
    filename: "test.txt",
    stream,
    mimeType: "text/plain",
    transferEncoding: "7bit",
    ...rest,
  } as MultipartRawFile;
}

describe("helpers", () => {
  describe("units", () => {
    test("should export correct binary units array", () => {
      expect(units).toEqual(["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]);
    });
  });

  describe("humanFileSize", () => {
    test("should format bytes", () => {
      expect(humanFileSize(100)).toBe("100 B");
      expect(humanFileSize(1023)).toBe("1023 B");
    });

    test("should format KiB", () => {
      expect(humanFileSize(1024)).toBe("1.0 KiB");
      expect(humanFileSize(1536)).toBe("1.5 KiB");
      expect(humanFileSize(2048)).toBe("2.0 KiB");
    });

    test("should format MiB", () => {
      expect(humanFileSize(1048576)).toBe("1.0 MiB");
      expect(humanFileSize(5242880)).toBe("5.0 MiB");
      expect(humanFileSize(1572864)).toBe("1.5 MiB");
    });

    test("should format GiB", () => {
      expect(humanFileSize(1073741824)).toBe("1.0 GiB");
      expect(humanFileSize(2147483648)).toBe("2.0 GiB");
    });

    test("should format TiB", () => {
      expect(humanFileSize(1099511627776)).toBe("1.0 TiB");
    });

    test("should handle custom decimal places", () => {
      expect(humanFileSize(1536, 2)).toBe("1.50 KiB");
      expect(humanFileSize(1638, 2)).toBe("1.60 KiB");
      expect(humanFileSize(1024, 0)).toBe("1 KiB");
    });

    test("should handle zero", () => {
      expect(humanFileSize(0)).toBe("0 B");
    });

    test("should handle negative values", () => {
      expect(humanFileSize(-1024)).toBe("-1.0 KiB");
      expect(humanFileSize(-100)).toBe("-100 B");
    });

    test("should handle Infinity", () => {
      expect(humanFileSize(Infinity)).toBe("Infinity");
    });

    test("should handle very large numbers", () => {
      const yib = 1024 ** 8;
      expect(humanFileSize(yib)).toMatch(/YiB$/);
    });

    test("should round correctly with decimal places", () => {
      expect(humanFileSize(1100, 1)).toBe("1.1 KiB");
      expect(humanFileSize(1149, 1)).toBe("1.1 KiB");
      expect(humanFileSize(1151, 1)).toBe("1.1 KiB");
    });
  });

  describe("ensurePath", () => {
    test("should create directory if it doesn't exist", async () => {
      const testDir = resolve(tmpdir(), "minimajs-test-" + Date.now());
      const result = await ensurePath(testDir);
      expect(result).toBe(testDir);
      // Cleanup
      await rm(testDir, { recursive: true, force: true });
    });

    test("should not fail if directory already exists", async () => {
      const testDir = resolve(tmpdir(), "minimajs-test-exists-" + Date.now());
      await mkdir(testDir, { recursive: true });
      const result = await ensurePath(testDir);
      expect(result).toBe(testDir);
      // Cleanup
      await rm(testDir, { recursive: true, force: true });
    });

    test("should create nested directories", async () => {
      const testBase = resolve(tmpdir(), "minimajs-test-nested-" + Date.now());
      const testDir = resolve(testBase, "level1", "level2", "level3");
      const result = await ensurePath(testDir);
      expect(result).toBe(testDir);
      // Cleanup
      await rm(testBase, { recursive: true, force: true });
    });

    test("should handle multiple path segments", async () => {
      const testBase = resolve(tmpdir(), "minimajs-test-segments-" + Date.now());
      const result = await ensurePath(testBase, "sub", "path");
      expect(result).toBe(resolve(testBase, "sub", "path"));
      // Cleanup
      await rm(testBase, { recursive: true, force: true });
    });

    test("should return resolved absolute path", async () => {
      const testDir = resolve(tmpdir(), "minimajs-test-abs-" + Date.now());
      const result = await ensurePath(testDir);
      expect(result).toMatch(/^[/\\]/); // Starts with / or \ for absolute path
      // Cleanup
      await rm(testDir, { recursive: true, force: true });
    });
  });

  describe("stream2buffer", () => {
    test("should convert stream to buffer", async () => {
      function* text2buffer(text: string[]) {
        for (const char of text) {
          yield Buffer.from(char);
        }
      }

      const stream = Readable.from(text2buffer(["hello", "world"]));

      const buffer = await stream2buffer(stream);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe("helloworld");
    });

    test("should handle binary data", async () => {
      const data = [Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from([0x0d, 0x0a, 0x1a, 0x0a])];
      const stream = Readable.from(data);

      const buffer = await stream2buffer(stream);

      expect(buffer).toEqual(Buffer.concat(data));
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);

      const buffer = await stream2buffer(stream);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(0);
    });

    test("should handle large streams", async () => {
      const chunkSize = 1024;
      const chunkCount = 100;
      const chunks = Array.from({ length: chunkCount }, () => Buffer.alloc(chunkSize, "x"));
      const stream = Readable.from(chunks);

      const buffer = await stream2buffer(stream);

      expect(buffer.length).toBe(chunkSize * chunkCount);
    });

    test("should reject on stream error", async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error("Stream error"));
        },
      });

      await expect(stream2buffer(stream)).rejects.toThrow("Stream error");
    });

    test("should handle single large buffer", async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024, "a"); // 1MB
      const stream = Readable.from([largeBuffer]);

      const buffer = await stream2buffer(stream);

      expect(buffer.length).toBe(largeBuffer.length);
      expect(buffer).toEqual(largeBuffer);
    });
  });

  describe("stream2void", () => {
    test("should consume stream without storing data", async () => {
      const content = "This should be discarded";
      const stream = Readable.from([content]);
      const voidStream = stream2void();

      await pipeline(stream, voidStream);

      // Test completes without error means stream was consumed
      expect(true).toBe(true);
    });

    test("should handle empty stream", async () => {
      const stream = Readable.from([]);
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).resolves.toBeUndefined();
    });

    test("should handle large streams efficiently", async () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const stream = Readable.from([largeContent]);
      const voidStream = stream2void();

      const startTime = Date.now();
      await pipeline(stream, voidStream);
      const duration = Date.now() - startTime;

      // Should complete reasonably fast
      expect(duration).toBeLessThan(1000);
    });

    test("should handle multiple chunks", async () => {
      const chunks = Array.from({ length: 100 }, (_, i) => `chunk ${i}`);
      const stream = Readable.from(chunks);
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).resolves.toBeUndefined();
    });

    test("should handle binary data", async () => {
      const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const stream = Readable.from([data]);
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).resolves.toBeUndefined();
    });

    test("should propagate stream errors", async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error("Stream error"));
        },
      });
      const voidStream = stream2void();

      await expect(pipeline(stream, voidStream)).rejects.toThrow("Stream error");
    });
  });

  describe("isFile", () => {
    test("should return true for File instances", () => {
      const file = new File(["content"], "test.txt");
      expect(isFile(file)).toBe(true);
    });

    test("should return false for non-File values", () => {
      expect(isFile(null)).toBe(false);
      expect(isFile(undefined)).toBe(false);
      expect(isFile({})).toBe(false);
      expect(isFile("string")).toBe(false);
      expect(isFile(Buffer.from("test"))).toBe(false);
    });
  });

  describe("isRawFile", () => {
    test("should return true for raw file objects", () => {
      const rawFile = { [RAW_FILE]: true, fieldname: "file", stream: Readable.from([]) };
      expect(isRawFile(rawFile)).toBe(true);
    });

    test("should return falsy for non-raw-file values", () => {
      expect(isRawFile(null)).toBeFalsy();
      expect(isRawFile(undefined)).toBeFalsy();
      expect(isRawFile({})).toBeFalsy();
      expect(isRawFile({ fieldname: "file" })).toBeFalsy();
    });
  });

  describe("isRawField", () => {
    test("should return true for raw field objects", () => {
      const rawField = { [RAW_FIELD]: true, fieldname: "name", value: "test" };
      expect(isRawField(rawField)).toBe(true);
    });

    test("should return falsy for non-raw-field values", () => {
      expect(isRawField(null)).toBeFalsy();
      expect(isRawField(undefined)).toBeFalsy();
      expect(isRawField({})).toBeFalsy();
      expect(isRawField({ fieldname: "name", value: "test" })).toBeFalsy();
    });
  });

  describe("raw2file", () => {
    test("should convert raw file stream to File", async () => {
      const rawFile = createRawFile({
        filename: "test.txt",
        content: "Hello, World!",
      });

      const file = await raw2file(rawFile, {});

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("test.txt");
      expect(file.type).toContain("text/plain");
      expect(await file.text()).toBe("Hello, World!");
    });

    test("should respect fileSize limit", async () => {
      const rawFile = createRawFile({ content: "Hello, World!" });

      await expect(raw2file(rawFile, { fileSize: 5 })).rejects.toThrow("Body exceeds maxSize");
    });
  });

  describe("raw2streamFile", () => {
    test("should wrap raw file into StreamFile", () => {
      const rawFile = createRawFile({
        filename: "test.txt",
        content: "content",
      });

      const streamFile = raw2streamFile(rawFile);

      expect(streamFile.name).toBe("test.txt");
      expect(streamFile.type).toContain("text/plain");
    });
  });

  describe("randomName", () => {
    test("should generate UUID filename with original extension", () => {
      const result = randomName("document.pdf");
      expect(result).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    });

    test("should handle files without extension", () => {
      const result = randomName("README");
      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });

    test("should preserve complex extensions", () => {
      const result = randomName("archive.tar.gz");
      expect(result).toMatch(/^[0-9a-f-]{36}\.gz$/);
    });
  });

  describe("save", () => {
    const testDir = resolve(tmpdir(), "minimajs-save-test-" + Date.now());

    beforeEach(async () => {
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    test("should save raw file to disk", async () => {
      const rawFile = createRawFile({ filename: "test.txt", content: "File content" });

      const filename = await save(rawFile, testDir);

      expect(filename).toMatch(/^[0-9a-f-]{36}\.txt$/);
      const savedContent = await readFile(join(testDir, filename), "utf8");
      expect(savedContent).toBe("File content");
    });

    test("should save File to disk", async () => {
      const content = "File content";
      const file = new File([content], "test.txt", { type: "text/plain" });

      const filename = await save(file, testDir);

      expect(filename).toMatch(/^[0-9a-f-]{36}\.txt$/);
      const savedContent = await readFile(join(testDir, filename), "utf8");
      expect(savedContent).toBe(content);
    });

    test("should use custom filename when provided", async () => {
      const content = "File content";
      const file = new File([content], "test.txt", { type: "text/plain" });

      const filename = await save(file, testDir, "custom-name.txt");

      expect(filename).toBe("custom-name.txt");
      const savedContent = await readFile(join(testDir, filename), "utf8");
      expect(savedContent).toBe(content);
    });
  });

  describe("drain", () => {
    test("should consume and discard raw file stream", async () => {
      const rawFile = createRawFile({ content: "content to drain" });

      await expect(drain(rawFile)).resolves.toBeUndefined();
    });
  });

  describe("stream2uint8array", () => {
    test("should convert stream to Uint8Array", async () => {
      const content = "Hello, World!";
      const stream = Readable.from([Buffer.from(content)]);

      const result = await stream2uint8array(stream, {});

      expect(result).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(result).toString()).toBe(content);
    });

    test("should handle multiple chunks", async () => {
      const chunks = ["Hello, ", "World!"];
      const stream = Readable.from(chunks.map((c) => Buffer.from(c)));

      const result = await stream2uint8array(stream, {});

      expect(Buffer.from(result).toString()).toBe("Hello, World!");
    });

    test("should throw when exceeding maxSize", async () => {
      const content = "Hello, World!";
      const stream = Readable.from([Buffer.from(content)]);

      await expect(stream2uint8array(stream, { fileSize: 5 })).rejects.toThrow("Body exceeds maxSize");
    });

    test("should grow buffer for large streams", async () => {
      // Create content larger than initial 64KB buffer
      const largeContent = "x".repeat(128 * 1024);
      const stream = Readable.from([Buffer.from(largeContent)]);

      const result = await stream2uint8array(stream, {});

      expect(result.byteLength).toBe(largeContent.length);
    });

    test("should handle Uint8Array chunks", async () => {
      const chunk = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const stream = Readable.from([chunk]);

      const result = await stream2uint8array(stream, {});

      expect(Buffer.from(result).toString()).toBe("Hello");
    });
  });
});
