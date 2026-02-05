import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { validator, validatorAsync } from "./validation.js";
import { ValidationError } from "./error.js";

describe("validation", () => {
  describe("validator", () => {
    test("validates data successfully", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const getData = validator(schema, () => ({ name: "John", age: 30 }), "body", {});

      expect(getData()).toEqual({ name: "John", age: 30 });
    });

    test("throws ValidationError for invalid data", () => {
      const schema = z.object({ email: z.email() });
      const getData = validator(schema, () => ({ email: "invalid" }), "body", {});

      expect(() => getData()).toThrow(ValidationError);
    });

    test("strips unknown properties by default", () => {
      const schema = z.object({ name: z.string() });
      const getData = validator(schema, () => ({ name: "John", extra: "field" }), "body", {});

      expect(getData()).toEqual({ name: "John" });
    });

    test("preserves unknown properties when stripUnknown is false", () => {
      const schema = z.object({ name: z.string() });
      const getData = validator(schema, () => ({ name: "John", extra: "field" }), "body", { stripUnknown: false });

      expect(getData()).toEqual({ name: "John", extra: "field" });
    });

    test("handles nested objects", () => {
      const schema = z.object({ user: z.object({ name: z.string(), email: z.email() }) });
      const getData = validator(schema, () => ({ user: { name: "John", email: "john@example.com" } }), "body", {});

      expect(getData().user).toEqual({ name: "John", email: "john@example.com" });
    });

    test("handles arrays and optional fields", () => {
      const schema = z.object({ tags: z.array(z.string()), nickname: z.string().optional() });
      const getData = validator(schema, () => ({ tags: ["a", "b"] }), "body", {});
      const result = getData();

      expect(result.tags).toEqual(["a", "b"]);
      expect(result.nickname).toBeUndefined();
    });

    test("throws for missing required fields", () => {
      const schema = z.object({ name: z.string(), email: z.string() });
      const getData = validator(schema, () => ({ name: "John" }), "body", {});

      expect(() => getData()).toThrow(ValidationError);
    });

    test("validates with refinements", () => {
      const schema = z
        .object({ password: z.string(), confirmPassword: z.string() })
        .refine((data) => data.password === data.confirmPassword);
      const getData = validator(schema, () => ({ password: "123", confirmPassword: "456" }), "body", {});

      expect(() => getData()).toThrow(ValidationError);
    });
  });

  describe("validatorAsync", () => {
    test("validates data successfully", async () => {
      const schema = z.object({ name: z.string() });
      const getData = validatorAsync(schema, () => ({ name: "John" }), "body", {});

      expect(await getData()).toEqual({ name: "John" });
    });

    test("throws ValidationError for invalid data", async () => {
      const schema = z.object({ email: z.email() });
      const getData = validatorAsync(schema, () => ({ email: "invalid" }), "body", {});

      await expect(getData()).rejects.toThrow(ValidationError);
    });

    test("handles async refinements", async () => {
      const schema = z.object({
        username: z.string().refine(async (val) => {
          await new Promise((r) => setTimeout(r, 5));
          return val !== "taken";
        }),
      });
      const getData = validatorAsync(schema, () => ({ username: "taken" }), "body", {});

      await expect(getData()).rejects.toThrow(ValidationError);
    });

    test("preserves unknown properties when stripUnknown is false", async () => {
      const schema = z.object({ name: z.string() });
      const getData = validatorAsync(schema, () => ({ name: "John", extra: "field" }), "body", { stripUnknown: false });

      expect(await getData()).toEqual({ name: "John", extra: "field" });
    });
  });

  describe("error handling", () => {
    test("includes field paths in ValidationError", () => {
      const schema = z.object({ user: z.object({ email: z.email() }) });
      const getData = validator(schema, () => ({ user: { email: "invalid" } }), "body", {});

      try {
        getData();
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationError = err as ValidationError;
        expect(validationError.issues?.[0]?.path).toContain("email");
      }
    });

    test("rethrows non-ZodError exceptions", () => {
      const schema = z.object({ name: z.string() });
      const getData = validator(
        schema,
        () => {
          throw new Error("Custom error");
        },
        "body",
        {}
      );

      expect(() => getData()).toThrow("Custom error");
      expect(() => getData()).not.toThrow(ValidationError);
    });
  });
});
