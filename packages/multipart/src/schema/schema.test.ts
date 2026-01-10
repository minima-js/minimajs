import { describe, test, expect } from "@jest/globals";
import { file, FileSchema } from "./schema.js";

describe("schema builder", () => {
  describe("file", () => {
    test("should have max method", () => {
      const schema = file();
      expect(typeof schema.max).toBe("function");
    });

    test("should have min method", () => {
      const schema = file();
      expect(typeof schema.min).toBe("function");
    });

    test("should have accept method", () => {
      const schema = file();
      expect(typeof schema.accept).toBe("function");
    });
  });

  describe("FileSchema", () => {
    describe("max", () => {
      test("should return new FileSchema instance", () => {
        const schema1 = file();
        const schema2 = schema1.max(1024);

        expect(schema2).toBeInstanceOf(FileSchema);
        expect(schema2).not.toBe(schema1);
      });

      test("should store max size in definition", () => {
        const schema = file().max(5000);
        expect(schema.def.max).toBe(5000);
      });

      test("should chain with other methods", () => {
        const schema = file().max(1024).min(100).accept(["image/*"]);
        expect(schema).toBeInstanceOf(FileSchema);
      });
    });

    describe("min", () => {
      test("should return new FileSchema instance", () => {
        const schema1 = file();
        const schema2 = schema1.min(100);

        expect(schema2).toBeInstanceOf(FileSchema);
        expect(schema2).not.toBe(schema1);
      });

      test("should store min size in definition", () => {
        const schema = file().min(100);
        expect(schema.def.min).toBe(100);
      });

      test("should chain with other methods", () => {
        const schema = file().min(100).max(1024).accept(["image/*"]);
        expect(schema).toBeInstanceOf(FileSchema);
      });
    });

    describe("accept", () => {
      test("should return new FileSchema instance", () => {
        const schema1 = file();
        const schema2 = schema1.accept(["image/*"]);

        expect(schema2).toBeInstanceOf(FileSchema);
        expect(schema2).not.toBe(schema1);
      });

      test("should store types in definition", () => {
        const types = ["image/png", "image/jpeg"];
        const schema = file().accept(types);
        expect(schema.def.types).toEqual(types);
      });

      test("should chain with other methods", () => {
        const schema = file().accept(["image/*"]).min(100).max(1024);
        expect(schema).toBeInstanceOf(FileSchema);
      });
    });

    describe("parse", () => {
      test("should pass through UploadedFile instances", () => {
        const schema = file();
        const mockFile = { type: "image/png" };
        const result = schema.parse(mockFile);
        expect(result).toBe(mockFile);
      });

      test("should work with chained constraints", () => {
        const schema = file().max(1024).min(100).accept(["image/*"]);
        const mockFile = { type: "image/png" };
        const result = schema.parse(mockFile);
        expect(result).toBe(mockFile);
      });
    });
  });
});
