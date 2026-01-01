import { ForbiddenError, HttpError, NotFoundError, ValidationError } from "./error.js";
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
    it("should not found", async () => {
      const response = await app.inject(createRequest("/hello"));
      expect(response.status).toBe(404);
      const body = await response.text();
      expect(body).toEqual(JSON.stringify({ message: "Route GET /hello not found" }));
    });

    it("should handle non-base http error", async () => {
      app.get("/", () => {
        throw new Error("Something went wrong");
      });
      const response = await app.inject(createRequest("/"));
      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe(JSON.stringify({ message: "Unable to process request" }));
    });
  });

  describe("HttpError", () => {
    it("should create an HttpError from an error", () => {
      const error = new Error("Test error");
      const httpError = HttpError.create(error);
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.statusCode).toBe(500);
      expect(httpError.response).toBe("Unable to process request");
    });

    it("should create an HttpError from a non-error", () => {
      const httpError = HttpError.create("Test error");
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError.statusCode).toBe(500);
      expect(httpError.message).toBe("Unable to process request");
    });

    it("should assign options properties to the instance", () => {
      const customError = new Error("Custom Base Error");
      const httpError = new HttpError("Test Response", 400, {
        code: "CUSTOM_CODE",
        base: customError,
      });
      expect(httpError.code).toBe("CUSTOM_CODE");
      expect(httpError.base).toBe(customError);
    });

    it("should handle non-string response", () => {
      const error = new HttpError({ a: 1 }, 400);
      expect(error.toJSON()).toEqual({ a: 1 });
    });

    it("should handle status code as string", () => {
      const error = new HttpError("An error occurred", "BAD_REQUEST");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("RedirectError", () => {
    it("should redirect to world when comes to hello temporary", async () => {
      app.get("/hello", () => {
        redirect("/world");
      });

      const response = await app.inject(createRequest("/hello"));
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/world");
    });

    it("should redirect to world when comes to hello permanent", async () => {
      app.get("/hello", () => {
        redirect("/world", true);
      });
      const response = await app.inject(createRequest("/hello"));
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe("/world");
    });
  });

  describe("NotFoundError", () => {
    it("should test not found error", async () => {
      app.get("/404", () => {
        throw new NotFoundError();
      });
      const res = await app.inject(createRequest("/404"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Route GET /404 not found" });
    });

    it("should test not found error with custom message", async () => {
      app.get("/404", () => {
        throw new NotFoundError("Custom not found message");
      });
      const res = await app.inject(createRequest("/404"));
      expect(res.status).toBe(404);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({
        message: "Custom not found message",
      });
    });
  });

  describe("ValidationError", () => {
    it("should test validation error", async () => {
      app.get("/validation", () => {
        throw new ValidationError();
      });
      const res = await app.inject(createRequest("/validation"));
      expect(res.status).toBe(422); // 422 Unprocessable Entity
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Validation failed" });
    });

    it("should test validation error with custom message", async () => {
      app.get("/validation-custom", () => {
        throw new ValidationError("Custom validation message");
      });
      const res = await app.inject(createRequest("/validation-custom"));
      expect(res.status).toBe(422); // 422 Unprocessable Entity
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({
        message: "Custom validation message",
      });
    });
  });

  describe("ForbiddenError", () => {
    it("should test forbidden error", async () => {
      app.get("/forbidden", () => {
        throw new ForbiddenError();
      });
      const res = await app.inject(createRequest("/forbidden"));
      expect(res.status).toBe(403);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({ message: "Forbidden" });
    });

    it("should test forbidden error with custom message", async () => {
      app.get("/forbidden-custom", () => {
        throw new ForbiddenError("Custom forbidden message");
      });
      const res = await app.inject(createRequest("/forbidden-custom"));
      expect(res.status).toBe(403);
      const body = JSON.parse(await res.text());
      expect(body).toStrictEqual({
        message: "Custom forbidden message",
      });
    });
  });
});
