import { BaseHttpError, HttpError, NotFoundError, createErrorDecorator } from "./error.js";
import { abort, createApp, redirect } from "./index.js";
import { mockApp, mockRoute } from "./mock/index.js";
import type { App } from "./types.js";
let app: App;

beforeEach(() => {
  app = createApp({ routes: { log: false } });
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
  });

  describe("createErrorDecorator", () => {
    it("should modify error response which is aborted by us", async () => {
      const decorator = createErrorDecorator((error) => {
        if (!HttpError.is(error)) {
          throw error;
        }
        throw new HttpError(
          {
            success: false,
            error: error.response,
          },
          error.statusCode
        );
      });

      app.register(decorator);
      app.get("/", () => {
        abort("I am not responding");
      });

      // Redirection should be working at same time.
      app.get("/hello", () => {
        redirect("/world", true);
      });
      const response = await app.inject({ path: "/" });
      expect(response.body).toBe(JSON.stringify({ success: false, error: "I am not responding" }));
      const response2 = await app.inject({
        path: "/hello",
      });
      expect(response2.statusCode).toBe(301);
      expect(response2.headers.location).toBe("/world");
    });

    it("should filter some decorator", async () => {
      const decorator = createErrorDecorator((error) => {
        if (!HttpError.is(error)) {
          throw error;
        }
        throw new HttpError(
          {
            decorated: error.response ?? "no res",
          },
          error.statusCode
        );
      });

      app.register(decorator, {
        filter(req) {
          return req.routeOptions.url !== "/passed";
        },
      });

      app.get("/", () => {
        abort("I am not responding");
      });

      app.get("/passed", () => {
        abort("I am not responding");
      });

      const responseDecorated = await app.inject({
        path: "/",
      });

      const responseNotDecorated = await app.inject({
        path: "/passed",
      });

      expect(responseDecorated.body).toBe(JSON.stringify({ decorated: "I am not responding" }));
      expect(responseNotDecorated.body).toBe(JSON.stringify({ message: "I am not responding" }));
    });

    it("should modify unknown error", async () => {
      const decorator = createErrorDecorator((error) => {
        if (BaseHttpError.is(error)) {
          // do not engage if this is already handled
          throw error;
        }
        throw error instanceof Error
          ? new HttpError(
              {
                message: error.message,
              },
              400
            )
          : new HttpError(
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
      expect(knownResponse.statusCode).toBe(400);
      expect(knownResponse.body).toBe(JSON.stringify({ message: "I am Adil" }));

      // test unknown response
      const unKnownResponse = await app.inject({ path: "/unknown" });
      expect(unKnownResponse.body).toBe(JSON.stringify({ message: "unknown", data: "I am Adil" }));
    });
  });
});
