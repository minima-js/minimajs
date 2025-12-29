import { ForbiddenError, HttpError, NotFoundError, ValidationError } from "./error.js";
import { createApp, redirect } from "./index.js";
import { mockApp, mockRoute } from "./mock/index.js";
import type { App } from "./interfaces/app.js";

let app: App;

beforeEach(() => {
  app = createApp({ logger: false });
});

afterEach(() => {
  return app.close();
});

describe("error module", () => {
  describe("errorHandler", () => {
    it("should not found", async () => {
      const response = await app.inject({
        path: "/hello",
      });
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual(JSON.stringify({ message: "Route GET /hello not found" }));
    });

    it("should handle non-base http error", async () => {
      app.get("/", () => {
        throw new Error("Something went wrong");
      });
      const response = await app.inject({ path: "/" });
      expect(response.statusCode).toBe(500);
      expect(response.body).toBe(JSON.stringify({ message: "Unable to process request" }));
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

      const response = await app.inject({ path: "/hello" });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("/world");
    });

    it("should redirect to world when comes to hello permanent", async () => {
      app.get("/hello", () => {
        redirect("/world", true);
      });
      const response = await app.inject({
        method: "GET",
        path: "/hello",
      });
      expect(response.statusCode).toBe(301);
      expect(response.headers.location).toBe("/world");
    });
  });

  describe("NotFoundError", () => {
    it("should test not found error", async () => {
      const notFoundRoute = mockRoute(
        () => {
          throw new NotFoundError();
        },
        { url: "/404" }
      );
      const [res] = await mockApp(notFoundRoute);
      expect(res?.statusCode).toBe(404);
      expect(res?.body).toStrictEqual({ message: "Route GET /404 not found" });
    });

    it("should test not found error with custom message", async () => {
      const notFoundRoute = mockRoute(
        () => {
          throw new NotFoundError("Custom not found message");
        },
        { url: "/404" }
      );
      const [res] = await mockApp(notFoundRoute);
      expect(res?.statusCode).toBe(404);
      expect(res?.body).toStrictEqual({
        message: "Custom not found message",
      });
    });
  });

  describe("ValidationError", () => {
    it("should test validation error", async () => {
      const validationError = mockRoute(
        () => {
          throw new ValidationError();
        },
        { url: "/validation" }
      );
      const [res] = await mockApp(validationError);
      expect(res?.statusCode).toBe(400);
      expect(res?.body).toStrictEqual({ message: "Validation failed" });
    });

    it("should test validation error with custom message", async () => {
      const validationError = mockRoute(
        () => {
          throw new ValidationError("Custom validation message");
        },
        { url: "/validation" }
      );
      const [res] = await mockApp(validationError);
      expect(res?.statusCode).toBe(400);
      expect(res?.body).toStrictEqual({
        message: "Custom validation message",
      });
    });
  });

  describe("ForbiddenError", () => {
    it("should test forbidden error", async () => {
      const forbiddenError = mockRoute(
        () => {
          throw new ForbiddenError();
        },
        { url: "/forbidden" }
      );
      const [res] = await mockApp(forbiddenError);
      expect(res?.statusCode).toBe(403);
      expect(res?.body).toStrictEqual({ message: "Forbidden" });
    });

    it("should test forbidden error with custom message", async () => {
      const forbiddenError = mockRoute(
        () => {
          throw new ForbiddenError("Custom forbidden message");
        },
        { url: "/forbidden" }
      );
      const [res] = await mockApp(forbiddenError);
      expect(res?.statusCode).toBe(403);
      expect(res?.body).toStrictEqual({
        message: "Custom forbidden message",
      });
    });
  });
});
