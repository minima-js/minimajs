import { describe, test, expect } from "@jest/globals";
import { humanFileSize, units, ensurePath, stream2void, stream2buffer } from "./helpers.js";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

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
});
