import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { validator, validatorAsync } from "./validation.js";
import { ValidationError } from "./error.js";

describe("validation", () => {
  describe("validator", () => {
    test("should validate data successfully", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const getData = validator(schema, () => ({ name: "John", age: 30 }));
      const result = getData();

      expect(result).toEqual({ name: "John", age: 30 });
    });

    test("should throw ValidationError for invalid data", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const getData = validator(schema, () => ({ email: "invalid" }));

      expect(() => getData()).toThrow(ValidationError);
    });

    test("should strip unknown properties by default", () => {
      const schema = z.object({
        name: z.string(),
      });

      const getData = validator(schema, () => ({ name: "John", extra: "field" }));
      const result = getData();

      expect(result).toEqual({ name: "John" });
      expect(result).not.toHaveProperty("extra");
    });

    test("should preserve unknown properties when stripUnknown is false", () => {
      const schema = z.object({
        name: z.string(),
      });

      const getData = validator(schema, () => ({ name: "John", extra: "field" }), {
        stripUnknown: false,
      });
      const result = getData();

      expect(result).toEqual({ name: "John", extra: "field" });
    });

    test("should handle nested objects", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      const getData = validator(schema, () => ({
        user: { name: "John", email: "john@example.com" },
      }));

      const result = getData();

      expect(result.user.name).toBe("John");
      expect(result.user.email).toBe("john@example.com");
    });

    test("should handle arrays", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const getData = validator(schema, () => ({ tags: ["tag1", "tag2"] }));
      const result = getData();

      expect(result.tags).toEqual(["tag1", "tag2"]);
    });

    test("should handle optional fields", () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      const getData = validator(schema, () => ({ name: "John" }));
      const result = getData();

      expect(result.name).toBe("John");
      expect(result.nickname).toBeUndefined();
    });

    test("should throw for missing required fields", () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
      });

      const getData = validator(schema, () => ({ name: "John" }));

      expect(() => getData()).toThrow(ValidationError);
    });

    test("should validate with refinements", () => {
      const schema = z
        .object({
          password: z.string(),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
        });

      const getData = validator(schema, () => ({
        password: "123",
        confirmPassword: "456",
      }));

      expect(() => getData()).toThrow(ValidationError);
    });
  });

  describe("validatorAsync", () => {
    test("should validate data successfully", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const getData = validatorAsync(schema, () => ({ name: "John", age: 30 }));
      const result = await getData();

      expect(result).toEqual({ name: "John", age: 30 });
    });

    test("should throw ValidationError for invalid data", async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const getData = validatorAsync(schema, () => ({ email: "invalid" }));

      await expect(getData()).rejects.toThrow(ValidationError);
    });

    test("should strip unknown properties by default", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const getData = validatorAsync(schema, () => ({ name: "John", extra: "field" }));
      const result = await getData();

      expect(result).toEqual({ name: "John" });
      expect(result).not.toHaveProperty("extra");
    });

    test("should preserve unknown properties when stripUnknown is false", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const getData = validatorAsync(schema, () => ({ name: "John", extra: "field" }), {
        stripUnknown: false,
      });
      const result = await getData();

      expect(result).toEqual({ name: "John", extra: "field" });
    });

    test("should handle async refinements", async () => {
      const schema = z.object({
        username: z.string().refine(
          async (val) => {
            // Simulate async validation
            await new Promise((resolve) => setTimeout(resolve, 10));
            return val !== "taken";
          },
          { message: "Username already taken" }
        ),
      });

      const getData = validatorAsync(schema, () => ({ username: "taken" }));

      await expect(getData()).rejects.toThrow(ValidationError);
    });

    test("should handle promise-based data callback", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const getData = validatorAsync(schema, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { name: "John" };
      });

      const result = await getData();

      expect(result.name).toBe("John");
    });

    test("should handle nested objects", async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      const getData = validatorAsync(schema, () => ({
        user: { name: "John", email: "john@example.com" },
      }));

      const result = await getData();

      expect(result.user.name).toBe("John");
      expect(result.user.email).toBe("john@example.com");
    });

    test("should throw for missing required fields", async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
      });

      const getData = validatorAsync(schema, () => ({ name: "John" }));

      await expect(getData()).rejects.toThrow(ValidationError);
    });
  });

  describe("error handling", () => {
    test("should include field paths in ValidationError", () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const getData = validator(schema, () => ({ user: { email: "invalid" } }));

      try {
        getData();
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationError = err as ValidationError;
        expect(validationError.issues).toBeDefined();
        expect(validationError.issues![0]!.path).toContain("user");
        expect(validationError.issues![0]!.path).toContain("email");
      }
    });

    test("should preserve ZodError information", () => {
      const schema = z.object({
        age: z.number().min(18),
      });

      const getData = validator(schema, () => ({ age: 15 }));

      try {
        getData();
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationError = err as ValidationError;
        expect(validationError.issues).toBeDefined();
        expect(validationError.issues!.length).toBeGreaterThan(0);
      }
    });

    test("should rethrow non-ZodError exceptions", () => {
      const schema = z.object({ name: z.string() });

      const getData = validator(schema, () => {
        throw new Error("Custom error");
      });

      expect(() => getData()).toThrow("Custom error");
      expect(() => getData()).not.toThrow(ValidationError);
    });
  });
});
