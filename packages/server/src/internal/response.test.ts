import { createApp, type App } from "../index.js";
import { ResponseAbort, isRequestAbortedError } from "./response.js";

describe("internal/response", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false, routes: { log: false } });
  });

  afterEach(() => app.close());
  describe("handleResponse", () => {
    test("plain string response", async () => {
      app.get("/", () => {
        return "hello world";
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe("hello world");
    });

    test("plain object synchronous response", async () => {
      app.get("/", () => {
        return { message: "hello world" };
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async  response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async synchronous response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("async iterator response with error", async () => {
      async function* generator() {
        yield "hello";
        yield " ";
        throw new Error("test");
      }
      app.get("/", () => {
        return generator();
      });
      try {
        await app.inject({ url: "/" });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe("isRequestAbortedError", () => {
    test("should return true for aborted error", () => {
      const error = new Error("test");
      (error as any).cause = ResponseAbort;
      expect(isRequestAbortedError(error)).toBe(true);
    });

    test("should return false for other errors", () => {
      const error = new Error("test");
      expect(isRequestAbortedError(error)).toBe(false);
    });
  });
});
