import { test, beforeEach, afterEach, describe, expect } from "@jest/globals";
import { HttpError, RedirectError, NotFoundError, ValidationError, BaseHttpError } from "./error.js";
import { redirect } from "./index.js";
import { createApp } from "./bun/index.js";
import type { App } from "./interfaces/app.js";
import { createRequest } from "./mock/request.js";

let app: App;

beforeEach(() => {
  app = createApp({ logger: false });
});

afterEach(() => app.close());

describe("error module", () => {
  describe("errorHandler", () => {
    test("should not found", async () => {
      const response = await app.handle(createRequest("/hello"));
      expect(response.status).toBe(404);
      const body = await response.text();
      expect(body).toEqual(JSON.stringify({ message: "Route GET /hello not found" }));
    });

    test("should handle non-base http error", async () => {
      app.get("/", () => {
        throw new Error("Something went wrong");
      });
      const response = await app.handle(createRequest("/"));
      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe(JSON.stringify({ message: "Unable to process request" }));
    });
  });

  describe("HttpError", () => {
    test("should create an HttpError from an error", () => {
      const error = new Error("Test error");
      const httpError = HttpError.create(error);
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.status).toBe(500);
      expect(httpError.response).toBe("Unable to process request");
    });

    test("should create an HttpError from a non-error", () => {
      const httpError = HttpError.create("Test error");
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.status).toBe(500);
      expect(httpError.message).toBe("Unable to process request");
    });

    test("should assign options properties to the instance", () => {
      const customError = new Error("Custom Base Error");
      const httpError = new HttpError("Test Response", 400, {
        code: "CUSTOM_CODE",
        base: customError,
      });
      expect(httpError.code).toBe("CUSTOM_CODE");
      expect(httpError.base).toBe(customError);
    });

    test("should handle non-string response", () => {
      const error = new HttpError({ a: 1 }, 400);
      expect(error.toJSON()).toEqual({ a: 1 });
    });

    test("should handle status code as string", () => {
      const error = new HttpError("An error occurred", "BAD_REQUEST");
      expect(error.status).toBe(400);
    });
  });

  describe("RedirectError", () => {
    test("should redirect to world when comes to hello temporary", async () => {
      app.get("/hello", () => {
        redirect("/world");
      });

      const response = await app.handle(createRequest("/hello"));
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/world");
    });

    test("should redirect to world when comes to hello permanent", async () => {
      app.get("/hello", () => {
        redirect("/world", true);
      });
      const response = await app.handle(createRequest("/hello"));
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe("/world");
    });
  });

  describe("NotFoundError", () => {
    test("should test not found error", async () => {
      app.get("/404", () => {
        throw new NotFoundError();
      });
      const res = await app.handle(createRequest("/404"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Route GET /404 not found" });
    });

    test("should test not found error with custom message", async () => {
      app.get("/404", () => {
        throw new NotFoundError("Custom not found message");
      });
      const res = await app.handle(createRequest("/404"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({
        message: "Custom not found message",
      });
    });
  });

  describe("ValidationError", () => {
    test("should test validation error", async () => {
      app.get("/validation", () => {
        throw new ValidationError();
      });
      const res = await app.handle(createRequest("/validation"));
      expect(res.status).toBe(422); // 422 Unprocessable Entity
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Validation failed" });
    });

    test("should test validation error with custom message", async () => {
      app.get("/validation-custom", () => {
        throw new ValidationError("Custom validation message");
      });
      const res = await app.handle(createRequest("/validation-custom"));
      expect(res.status).toBe(422); // 422 Unprocessable Entity
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({
        message: "Custom validation message",
      });
    });

    test("should test validation error with object response", async () => {
      app.get("/validation-object", () => {
        throw new ValidationError({ errors: ["field1 is required", "field2 is invalid"] });
      });
      const res = await app.handle(createRequest("/validation-object"));
      expect(res.status).toBe(422);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ errors: ["field1 is required", "field2 is invalid"] });
    });
  });

  describe("HttpError edge cases", () => {
    test("should handle HttpError with custom headers", async () => {
      app.get("/error-headers", () => {
        throw new HttpError("Error with headers", 400, {
          headers: { "X-Custom-Error": "true", "X-Error-Code": "BAD_REQUEST" },
        });
      });
      const res = await app.handle(createRequest("/error-headers"));
      expect(res.status).toBe(400);
      expect(res.headers.get("X-Custom-Error")).toBe("true");
      expect(res.headers.get("X-Error-Code")).toBe("BAD_REQUEST");
    });

    test("should handle HttpError with custom code", async () => {
      app.get("/error-code", () => {
        throw new HttpError("Error", 400, { code: "INVALID_INPUT" });
      });
      const res = await app.handle(createRequest("/error-code"));
      expect(res.status).toBe(400);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Error" });
    });

    test("should handle HttpError with object response", async () => {
      app.get("/error-object", () => {
        throw new HttpError({ error: "Custom error", details: { field: "value" } }, 400);
      });
      const res = await app.handle(createRequest("/error-object"));
      expect(res.status).toBe(400);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ error: "Custom error", details: { field: "value" } });
    });

    test("should handle HttpError with base error", async () => {
      const originalError = new Error("Original error message");
      app.get("/error-base", () => {
        throw new HttpError("Wrapped error", 500, { base: originalError });
      });
      const res = await app.handle(createRequest("/error-base"));
      expect(res.status).toBe(500);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Wrapped error" });
    });

    test("should handle HttpError.create with null", () => {
      const httpError = HttpError.create(null);
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.status).toBe(500);
    });

    test("should handle HttpError.create with undefined", () => {
      const httpError = HttpError.create(undefined);
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.status).toBe(500);
    });

    test("should handle HttpError.create with number", () => {
      const httpError = HttpError.create(123);
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.status).toBe(500);
    });

    test("should handle HttpError.create with custom status", () => {
      const error = new Error("Test");
      const httpError = HttpError.create(error, 503);
      expect(httpError.status).toBe(503);
    });

    test("should handle various status code strings", () => {
      expect(new HttpError("Error", "OK").status).toBe(200);
      expect(new HttpError("Error", "CREATED").status).toBe(201);
      expect(new HttpError("Error", "BAD_REQUEST").status).toBe(400);
      expect(new HttpError("Error", "UNAUTHORIZED").status).toBe(401);
      expect(new HttpError("Error", "FORBIDDEN").status).toBe(403);
      expect(new HttpError("Error", "NOT_FOUND").status).toBe(404);
      expect(new HttpError("Error", "INTERNAL_SERVER_ERROR").status).toBe(500);
    });

    test("should handle HttpError.is static method", () => {
      const httpError = new HttpError("Test", 400);
      const regularError = new Error("Regular");
      const notFoundError = new NotFoundError();

      expect(HttpError.is(httpError)).toBe(true);
      expect(HttpError.is(notFoundError)).toBe(true);
      expect(HttpError.is(regularError)).toBe(false);
      expect(HttpError.is(null)).toBe(false);
      expect(HttpError.is(undefined)).toBe(false);
    });

    test("should handle BaseHttpError.is static method", () => {
      const httpError = new HttpError("Test", 400);
      const notFoundError = new NotFoundError();
      const redirectError = new RedirectError("/test");
      const regularError = new Error("Regular");

      expect(BaseHttpError.is(httpError)).toBe(true);
      expect(BaseHttpError.is(notFoundError)).toBe(true);
      expect(BaseHttpError.is(redirectError)).toBe(true);
      expect(BaseHttpError.is(regularError)).toBe(false);
    });
  });

  describe("RedirectError edge cases", () => {
    test("should handle redirect with custom headers", async () => {
      app.get("/redirect-headers", () => {
        throw new RedirectError("/target", false, {
          headers: { "X-Custom": "value" },
        });
      });
      const res = await app.handle(createRequest("/redirect-headers"));
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/target");
      expect(res.headers.get("X-Custom")).toBe("value");
    });

    test("should handle redirect with absolute URL", async () => {
      app.get("/redirect-absolute", () => {
        throw new RedirectError("https://example.com/target");
      });
      const res = await app.handle(createRequest("/redirect-absolute"));
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("https://example.com/target");
    });

    test("should handle permanent redirect", async () => {
      app.get("/redirect-permanent", () => {
        throw new RedirectError("/target", true);
      });
      const res = await app.handle(createRequest("/redirect-permanent"));
      expect(res.status).toBe(301);
      expect(res.headers.get("Location")).toBe("/target");
    });

    test("should handle temporary redirect explicitly", async () => {
      app.get("/redirect-temporary", () => {
        throw new RedirectError("/target", false);
      });
      const res = await app.handle(createRequest("/redirect-temporary"));
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/target");
    });
  });

  describe("NotFoundError edge cases", () => {
    test("should handle NotFoundError with object response", async () => {
      app.get("/notfound-object", () => {
        throw new NotFoundError({ error: "Resource not found", id: 123 });
      });
      const res = await app.handle(createRequest("/notfound-object"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ error: "Resource not found", id: 123 });
    });

    test("should auto-generate message when response is empty", async () => {
      app.get("/notfound-auto", () => {
        throw new NotFoundError();
      });
      const res = await app.handle(createRequest("/notfound-auto"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body.message).toBe("Route GET /notfound-auto not found");
    });

    test("should handle NotFoundError with custom options", async () => {
      app.get("/notfound-options", () => {
        throw new NotFoundError("Custom", { code: "RESOURCE_NOT_FOUND" });
      });
      const res = await app.handle(createRequest("/notfound-options"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Custom" });
    });
  });

  describe("Error serialization", () => {
    test("should serialize string response correctly", () => {
      const error = new HttpError("Simple error message", 400);
      const json = error.toJSON();
      expect(json).toEqual({ message: "Simple error message" });
    });

    test("should serialize object response correctly", () => {
      const error = new HttpError({ code: "ERR001", details: { field: "value" } }, 400);
      const json = error.toJSON();
      expect(json).toEqual({ code: "ERR001", details: { field: "value" } });
    });

    test("should serialize array response correctly", () => {
      const error = new HttpError(["error1", "error2"], 400);
      const json = error.toJSON();
      expect(json).toEqual(["error1", "error2"]);
    });

    test("should serialize null response correctly", () => {
      const error = new HttpError(null, 400);
      const json = error.toJSON();
      expect(json).toBeNull();
    });
  });
});
