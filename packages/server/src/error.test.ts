import {
  BaseHttpError,
  ForbiddenError,
  HttpError,
  NotFoundError,
  ValidationError,
  createErrorDecorator,
} from "./error.js";
import { abort, createApp, redirect } from "./index.js";
import { mockApp, mockRoute } from "./mock/index.js";
import type { App } from "./types.js";

class ErrorWrapper extends HttpError {
  constructor(public originalError: unknown) {
    super("Wrapped Error", 500);
  }

  toJSON() {
    return {
      message: (this.originalError as Error).message,
      wrapped: true,
    };
  }
}

let app: App;

beforeEach(() => {
  app = createApp({ logger: false, routes: { log: false } });
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

  describe("createErrorDecorator", () => {
    it("should modify error response which is aborted by us", async () => {
      const currentApp = createApp({ routes: { log: false } });
      const decorator = createErrorDecorator((error) => {
        if (!(error instanceof Error)) {
          throw error;
        }
        return {
          success: false,
          error: error.message,
        };
      });

      currentApp.register(decorator);
      currentApp.get("/", () => {
        abort("I am not responding");
      });

      const response = await currentApp.inject({ path: "/" });
      expect(response.body).toBe(JSON.stringify({ success: false, error: "I am not responding" }));
      await currentApp.close();
    });

    it("should handle redirection when error is abort", async () => {
      const decorator = createErrorDecorator((error) => {
        if (!(error instanceof Error)) {
          throw error;
        }
        return {
          success: false,
          error: error.message,
        };
      });

      app.register(decorator);
      app.get("/hello", () => {
        redirect("/world", true);
      });
      const response = await app.inject({
        path: "/hello",
      });
      expect(response.statusCode).toBe(301);
      expect(response.headers.location).toBe("/world");
    });

    it("should filter some decorator", async () => {
      const currentApp = createApp({ routes: { log: false } });
      const decorator = createErrorDecorator((error) => {
        if (!(error instanceof Error)) {
          throw error;
        }
        return {
          decorated: error.message ?? "no res",
        };
      });

      currentApp.register(decorator, {
        filter(req) {
          return req.routeOptions.url !== "/passed";
        },
      });

      currentApp.get("/", () => {
        abort("I am not responding");
      });

      currentApp.get("/passed", () => {
        abort("I am not responding");
      });

      const responseDecorated = await currentApp.inject({
        path: "/",
      });

      const responseNotDecorated = await currentApp.inject({
        path: "/passed",
      });

      expect(responseDecorated.body).toBe(JSON.stringify({ decorated: "I am not responding" }));
      expect(responseNotDecorated.body).toBe(JSON.stringify({ message: "I am not responding" }));
      await currentApp.close();
    });

    it("should handle error when decorator throws an error", async () => {
      const decorator = createErrorDecorator(() => {
        throw new Error("Decorator error");
      });

      app.register(decorator);
      app.get("/", () => {
        throw new Error("I am not responding");
      });

      const response = await app.inject({ path: "/" });
      expect(response.statusCode).toBe(500);
      expect(response.body).toBe(JSON.stringify({ message: "Unable to process request" }));
    });

    it("should modify unknown error", async () => {
      const decorator = createErrorDecorator((error) => {
        if (BaseHttpError.is(error)) {
          // do not engage if this is already handled
          throw error;
        }
        if (error instanceof Error) {
          throw new ErrorWrapper(error);
        }
        throw new HttpError(
          {
            message: "unknown",
            data: error,
          },
          400
        );
      });
      app.register(decorator);

      app.get("/unknown", () => {
        throw "I am Adil";
      });

      app.get("/known", () => {
        throw new Error("I am Adil");
      });

      // redirection should be working at same time.
      app.get("/hello", () => {
        redirect("/world", true);
      });
      const response2 = await app.inject({
        method: "GET",
        path: "/hello",
      });
      expect(response2.statusCode).toBe(301);
      expect(response2.headers.location).toBe("/world");

      // test known response
      const knownResponse = await app.inject({ path: "/known" });
      expect(knownResponse.statusCode).toBe(500);
      expect(knownResponse.body).toBe(JSON.stringify({ message: "I am Adil", wrapped: true }));

      // test unknown response
      const unKnownResponse = await app.inject({ path: "/unknown" });
      expect(unKnownResponse.body).toBe(JSON.stringify({ message: "unknown", data: "I am Adil" }));
    });
  });
});
