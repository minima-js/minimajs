import { createApp, getSearchParam } from "./index.js";
import { filter, interceptor, type Interceptor } from "./interceptor.js";
import type { App } from "./types.js";
import { jest } from "@jest/globals";

describe("middleware", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ routes: { log: false } });
  });
  afterEach(() => app.close());
  test("should call middleware function", async () => {
    const hello = jest.fn(() => Promise.resolve());
    app.register(
      interceptor([hello], async (app) => {
        app.get("/hello", () => {
          return "hello";
        });
      })
    );
    app.get("/", () => "welcome home");
    const response = await app.inject({ url: "/" });
    expect(response.body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject({ url: "/hello" });
    expect(response2.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });

  test("should call middleware function with promise callback", async () => {
    const hello = jest.fn(() => Promise.resolve());
    app.register(
      interceptor(
        [hello],
        Promise.resolve({
          default: async (app: App) => {
            app.get("/hello", () => {
              return "hello";
            });
          },
        })
      )
    );
    app.get("/", () => "welcome home");
    const response = await app.inject({ url: "/" });
    expect(response.body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject({ url: "/hello" });
    expect(response2.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });

  test("should filter middleware function", async () => {
    const hello = jest.fn(() => Promise.resolve());
    const filteredHello = filter(
      async () => hello(),
      function doFilter() {
        return getSearchParam("name") === "Adil";
      }
    );
    app.register(
      interceptor([filteredHello], async (app) => {
        app.get("/hello", () => {
          return "hello";
        });
      })
    );
    app.get("/", () => "welcome home");
    const response = await app.inject({ url: "/" });
    expect(response.body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject({ url: "/hello" });
    expect(response2.body).toBe("hello");
    expect(hello).not.toHaveBeenCalled();
    const response3 = await app.inject({ url: "/hello?name=Adil" });
    expect(response3.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });

  test("should filter middleware function with non-async handler", async () => {
    const hello = jest.fn<Interceptor>((_req, _res, done) => done());
    const filteredHello = filter(hello, function doFilter() {
      return getSearchParam("name") === "Adil";
    });
    app.register(
      interceptor([filteredHello], async (app) => {
        app.get("/hello", () => {
          return "hello";
        });
      })
    );
    app.get("/", () => "welcome home");
    const response = await app.inject({ url: "/" });
    expect(response.body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject({ url: "/hello" });
    expect(response2.body).toBe("hello");
    expect(hello).not.toHaveBeenCalled();
    const response3 = await app.inject({ url: "/hello?name=Adil" });
    expect(response3.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });
});
