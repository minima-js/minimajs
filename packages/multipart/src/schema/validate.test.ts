import { describe, test, expect } from "@jest/globals";
import { ZodError, z } from "zod";
import { mimeType, maxSize, minSize, maximum } from "./validate.js";
import { file } from "./schema.js";
import type { MultipartRawFile } from "../types.js";

function createRawFile(overrides: Partial<MultipartRawFile> = {}): MultipartRawFile {
  return {
    filename: "test.pdf",
    fieldname: "doc",
    transferEncoding: "utf-8",
    mimeType: "application/pdf",
    stream: {} as any,
    ...overrides,
  };
}

describe("validate", () => {
  describe("mimeType", () => {
    test("should allow any file when accept is empty", () => {
      const schema = file();
      expect(() => mimeType(schema, createRawFile())).not.toThrow();
    });

    test("should allow exact MIME type match", () => {
      const schema = file().accept(["application/pdf"]);
      expect(() => mimeType(schema, createRawFile())).not.toThrow();
    });

    test("should allow wildcard */*", () => {
      const schema = file().accept(["*/*"]);
      expect(() => mimeType(schema, createRawFile())).not.toThrow();
    });

    test("should allow wildcard type image/*", () => {
      const f = createRawFile({ filename: "profile.png", mimeType: "image/png" });
      const schema = file().accept(["image/*"]);
      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow wildcard subtype */png", () => {
      const f = createRawFile({ filename: "profile.png", mimeType: "image/png" });
      const schema = file().accept(["*/png"]);
      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow extension match", () => {
      const f = createRawFile({ filename: "test.pdf" });
      const schema = file().accept([".pdf"]);
      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should be case-insensitive for extensions", () => {
      const f = createRawFile({ filename: "test.PDF" });
      const schema = file().accept([".pdf"]);
      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should throw for invalid MIME type", () => {
      const f = createRawFile({ mimeType: "application/pdf" });
      const schema = file().accept(["image/png"]);
      expect(() => mimeType(schema, f)).toThrow(ZodError);
    });

    test("should include error details for invalid MIME type", () => {
      const f = createRawFile({ mimeType: "application/pdf" });
      const schema = file().accept(["image/png", "image/jpeg"]);

      try {
        mimeType(schema, f);
        fail("Should have thrown");
      } catch (err) {
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.message).toContain("Invalid file type");
        expect(zodError.issues[0]?.message).toContain("image/png, image/jpeg");
        expect(zodError.issues[0]?.message).toContain("application/pdf");
        expect(zodError.issues[0]?.path).toEqual(["doc"]);
      }
    });

    test("should reject extension mismatch", () => {
      const f = createRawFile({ filename: "test.pdf" });
      const schema = file().accept([".txt"]);
      expect(() => mimeType(schema, f)).toThrow(ZodError);
    });
  });

  describe("maxSize", () => {
    test("should throw ZodError when size exceeds max", () => {
      const f = createRawFile();
      const schema = file().max(1024);
      expect(() => maxSize(schema, f, 2048)).toThrow(ZodError);
    });

    test("should include human-readable sizes in error message", () => {
      const f = createRawFile();
      const schema = file().max(1024);

      try {
        maxSize(schema, f, 2048);
        fail("Should have thrown");
      } catch (err) {
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.message).toContain("1.0 KiB");
        expect(zodError.issues[0]?.message).toContain("2.0 KiB");
      }
    });

    test("should include field path and error details", () => {
      const f = createRawFile({ fieldname: "avatar" });
      const schema = file().max(1024);

      try {
        maxSize(schema, f, 2048);
        fail("Should have thrown");
      } catch (err) {
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.path).toEqual(["avatar"]);
        expect(zodError.issues[0]?.code).toBe("too_big");
        expect((zodError.issues[0] as any).maximum).toBe(1024);
        expect((zodError.issues[0] as any).input).toBe(2048);
      }
    });
  });

  describe("minSize", () => {
    test("should not throw when size meets minimum", async () => {
      const f = createRawFile();
      const schema = file().min(1000);
      await expect(minSize(schema, f, 2000)).resolves.toBeUndefined();
    });

    test("should throw when size is below minimum", async () => {
      const f = createRawFile();
      const schema = file().min(2000);
      await expect(minSize(schema, f, 1000)).rejects.toThrow(ZodError);
    });

    test("should include error details", async () => {
      const f = createRawFile({ fieldname: "avatar" });
      const schema = file().min(2048);

      await expect(minSize(schema, f, 1024)).rejects.toThrow((err: ZodError) => {
        expect(err.issues[0]?.message).toContain("2.0 KiB");
        expect(err.issues[0]?.message).toContain("1.0 KiB");
        expect(err.issues[0]?.message).toContain("avatar");
        expect(err.issues[0]?.code).toBe("too_small");
        return true;
      });
    });
  });

  describe("maximum", () => {
    test("should not throw when length is below maximum", () => {
      const schema = z.array(z.string()).max(5);
      expect(() => maximum(schema as any, 3, "files")).not.toThrow();
    });

    test("should throw when length equals or exceeds maximum", () => {
      const schema = z.array(z.string()).max(5);
      expect(() => maximum(schema as any, 5, "files")).toThrow(ZodError);
    });

    test("should include error details", () => {
      const schema = z.array(z.string()).max(3);

      expect(() => maximum(schema as any, 3, "images")).toThrow((err: ZodError) => {
        expect(err.issues[0]?.path).toEqual(["images"]);
        expect(err.issues[0]?.code).toBe("too_big");
        expect((err.issues[0] as any).maximum).toBe(3);
        return true;
      });
    });
  });
});
