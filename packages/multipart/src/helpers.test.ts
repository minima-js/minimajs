import { describe, test, expect } from "@jest/globals";
import { humanFileSize, units, ensurePath } from "./helpers.js";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

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
});
