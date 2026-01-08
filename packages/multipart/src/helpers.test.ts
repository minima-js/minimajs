import { describe, test, expect } from "@jest/globals";
import { getBytes, humanFileSize, units } from "./helpers.js";

describe("helpers", () => {
  describe("units", () => {
    test("should export correct binary units array", () => {
      expect(units).toEqual(["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]);
    });
  });

  describe("getBytes", () => {
    test("should convert KiB to bytes", () => {
      expect(getBytes(1, "KiB")).toBe(1024);
      expect(getBytes(5, "KiB")).toBe(5120);
    });

    test("should convert MiB to bytes", () => {
      expect(getBytes(1, "MiB")).toBe(1048576); // 1024 * 1024
      expect(getBytes(5, "MiB")).toBe(5242880);
    });

    test("should convert GiB to bytes", () => {
      expect(getBytes(1, "GiB")).toBe(1073741824); // 1024 * 1024 * 1024
      expect(getBytes(2, "GiB")).toBe(2147483648);
    });

    test("should convert TiB to bytes", () => {
      expect(getBytes(1, "TiB")).toBe(1099511627776); // 1024^4
    });

    test("should convert PiB to bytes", () => {
      expect(getBytes(1, "PiB")).toBe(1125899906842624); // 1024^5
    });

    test("should convert EiB to bytes", () => {
      expect(getBytes(1, "EiB")).toBe(1152921504606846976); // 1024^6
    });

    test("should handle fractional sizes", () => {
      expect(getBytes(0.5, "MiB")).toBe(524288); // 0.5 * 1024 * 1024
      expect(getBytes(1.5, "KiB")).toBe(1536);
    });

    test("should handle zero", () => {
      expect(getBytes(0, "MiB")).toBe(0);
    });

    test("should handle decimal values correctly", () => {
      expect(getBytes(2.5, "MiB")).toBe(2621440);
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
});
