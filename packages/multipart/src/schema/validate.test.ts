import { describe, test, expect } from "@jest/globals";
import { ZodError, z } from "zod";
import { Readable } from "node:stream";
import { mimeType, maxSize, minSize, maximum } from "./validate.js";
import { file } from "./schema.js";
import { File } from "../file.js";

describe("validate", () => {
  describe("mimeType", () => {
    test("should allow any file when accept is empty array", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file();
      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow file with exact MIME type match", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept(["application/pdf"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow file with wildcard */*", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept(["*/*"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow file with wildcard type image/*", () => {
      const stream = Readable.from(["test"]);
      const f = new File("avatar", "profile.png", "7bit", "image/png", stream);
      const schema = file().accept(["image/*"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow file with wildcard subtype */png", () => {
      const stream = Readable.from(["test"]);
      const f = new File("avatar", "profile.png", "7bit", "image/png", stream);
      const schema = file().accept(["*/png"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should allow file with extension match", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept([".pdf"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should be case-insensitive for extensions", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.PDF", "7bit", "application/pdf", stream);
      const schema = file().accept([".pdf"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should throw ZodError for invalid MIME type", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept(["image/png"]);

      expect(() => mimeType(schema, f)).toThrow(ZodError);
    });

    test("should throw with correct error message for invalid MIME type", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept(["image/png", "image/jpeg"]);

      try {
        mimeType(schema, f);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.message).toContain("Invalid file type");
        expect(zodError.issues[0]?.message).toContain("image/png, image/jpeg");
        expect(zodError.issues[0]?.message).toContain("application/pdf");
      }
    });

    test("should include field path in error", () => {
      const stream = Readable.from(["test"]);
      const f = new File("avatar", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept(["image/*"]);

      try {
        mimeType(schema, f);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.path).toEqual(["avatar"]);
      }
    });

    test("should allow multiple valid types", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept(["image/png", "application/pdf", "text/plain"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should reject extension mismatch", () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().accept([".txt"]);

      expect(() => mimeType(schema, f)).toThrow(ZodError);
    });

    test("should handle files without extension", () => {
      const stream = Readable.from(["test"]);
      const f = new File("readme", "README", "7bit", "text/plain", stream);
      const schema = file().accept([".txt"]);

      expect(() => mimeType(schema, f)).toThrow(ZodError);
    });

    test("should match video wildcard", () => {
      const stream = Readable.from(["test"]);
      const f = new File("video", "clip.mp4", "7bit", "video/mp4", stream);
      const schema = file().accept(["video/*"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });

    test("should match audio wildcard", () => {
      const stream = Readable.from(["test"]);
      const f = new File("audio", "song.mp3", "7bit", "audio/mpeg", stream);
      const schema = file().accept(["audio/*"]);

      expect(() => mimeType(schema, f)).not.toThrow();
    });
  });

  describe("maxSize", () => {
    test("should throw ZodError when size exceeds max", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().max(1024);
      const actualSize = 2048;

      await expect(maxSize(schema, f, actualSize)).rejects.toThrow(ZodError);
    });

    test("should include human-readable sizes in error message", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().max(1024);
      const actualSize = 2048;

      try {
        await maxSize(schema, f, actualSize);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.message).toContain("1.0 KiB");
        expect(zodError.issues[0]?.message).toContain("2.0 KiB");
      }
    });

    test("should include field path in error", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("avatar", "profile.png", "7bit", "image/png", stream);
      const schema = file().max(1000);

      try {
        await maxSize(schema, f, 2000);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.path).toEqual(["avatar"]);
      }
    });

    test("should have correct error code", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().max(1000);

      try {
        await maxSize(schema, f, 2000);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.code).toBe("too_big");
      }
    });

    test("should include maximum and input in issue", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const maxBytes = 1024;
      const actualSize = 2048;
      const schema = file().max(maxBytes);

      try {
        await maxSize(schema, f, actualSize);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect((zodError.issues[0] as any).maximum).toBe(maxBytes);
        expect((zodError.issues[0] as any).input).toBe(actualSize);
      }
    });
  });

  describe("minSize", () => {
    test("should not throw when size meets minimum", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().min(1000);

      await expect(minSize(schema, f, 2000)).resolves.toBeUndefined();
    });

    test("should not throw when size equals minimum", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().min(1000);

      await expect(minSize(schema, f, 1000)).resolves.toBeUndefined();
    });

    test("should throw when size is below minimum", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().min(2000);

      await expect(minSize(schema, f, 1000)).rejects.toThrow(ZodError);
    });

    test("should include human-readable sizes in error message", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().min(2048);

      try {
        await minSize(schema, f, 1024);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.message).toContain("2.0 KiB");
        expect(zodError.issues[0]?.message).toContain("1.0 KiB");
      }
    });

    test("should include field name in error message", async () => {
      const stream = Readable.from(["test"]);
      const f = new File("avatar", "profile.png", "7bit", "image/png", stream);
      const schema = file().min(2000);

      try {
        await minSize(schema, f, 1000);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.message).toContain("avatar");
      }
    });

    test("should have correct error code", async () => {
      const stream = Readable.from(["test"]);
      const file1 = new File("doc", "test.pdf", "7bit", "application/pdf", stream);
      const schema = file().min(2000);

      try {
        await minSize(schema, file1, 1000);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.code).toBe("too_small");
      }
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

    test("should include field path in error", () => {
      const schema = z.array(z.string()).max(3);
      try {
        maximum(schema as any, 3, "images");
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.path).toEqual(["images"]);
      }
    });

    test("should have correct error code", () => {
      const schema = z.array(z.string()).max(3);
      try {
        maximum(schema as any, 3, "files");
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect(zodError.issues[0]?.code).toBe("too_big");
      }
    });

    test("should include maximum value in error", () => {
      const schema = z.array(z.string()).max(5);
      try {
        maximum(schema as any, 5, "files");
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        expect((zodError.issues[0] as any).maximum).toBe(5);
      }
    });

    test("should handle various maximum values", () => {
      const schema1 = z.array(z.string()).max(1);
      expect(() => maximum(schema1 as any, 1, "file")).toThrow(ZodError);

      const schema10 = z.array(z.string()).max(10);
      expect(() => maximum(schema10 as any, 5, "files")).not.toThrow();
    });
  });
});
