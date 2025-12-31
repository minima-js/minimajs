import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { abort, context, searchParams } from "./index.js";
import { createApp } from "./bun/index.js";
import { interceptor, type Interceptor } from "./interceptor.js";
import type { App } from "./interfaces/app.js";

describe("middleware", () => {
  let app: App;
  beforeEach(() => {
    app = createApp();
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
    const response = await app.inject("/");
    const body = await response.text();
    expect(body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject("/hello");
    const body2 = await response2.text();
    expect(body2).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });

  test("should filter middleware function", async () => {
    const hello = jest.fn(() => Promise.resolve());
    const filteredHello = interceptor.filter(
      async () => hello(),
      function doFilter() {
        return searchParams.get("name") === "Adil";
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
    const response = await app.inject("/");
    const body = await response.text();
    expect(body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject("/hello");
    const body2 = await response2.text();
    expect(body2).toBe("hello");
    expect(hello).not.toHaveBeenCalled();
    const response3 = await app.inject("/hello?name=Adil");
    expect(response3.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });

  test("should filter middleware function with non-async handler", async () => {
    const hello = jest.fn<Interceptor>();
    const filteredHello = interceptor.filter(hello, function doFilter() {
      return searchParams.get("name") === "Adil";
    });
    app.register(
      interceptor([filteredHello], async (app) => {
        app.get("/hello", () => {
          return "hello";
        });
      })
    );
    app.get("/", () => "welcome home");
    const response = await app.inject("/");
    const body = await response.text();
    expect(body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject("/hello");
    const body2 = await response2.text();
    expect(body2).toBe("hello");
    expect(hello).not.toHaveBeenCalled();
    const response3 = await app.inject("/hello?name=Adil");
    expect(response3.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });
});

describe("interceptor.response", () => {
  let app: App;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app.close());

  describe("basic functionality", () => {
    test("should decorate response with simple wrapper", async () => {
      app.register(
        interceptor.response((res) => {
          return { decorated: true, data: res };
        })
      );
      app.get("/", () => ({ message: "hello world" }));
      await app.ready();
      const res = await app.inject("/");
      expect(res.body).toBe(
        JSON.stringify({
          decorated: true,
          data: { message: "hello world" },
        })
      );
    });

    test("should support async decorator", async () => {
      app.register(
        interceptor.response(async (res) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { decorated: true, data: res };
        })
      );
      app.get("/", () => ({ message: "async test" }));

      const res = await app.inject("/");
      expect(res.body).toBe(
        JSON.stringify({
          decorated: true,
          data: { message: "async test" },
        })
      );
    });

    test("should chain multiple app-level decorators", async () => {
      app.register(
        interceptor.response((res) => {
          return { step1: true, data: res };
        })
      );
      app.register(
        interceptor.response((res) => {
          return { step2: true, data: res };
        })
      );
      app.get("/", () => ({ value: "original" }));

      const res = await app.inject("/");
      expect(res.body).toBe(
        JSON.stringify({
          step2: true,
          data: {
            step1: true,
            data: { value: "original" },
          },
        })
      );
    });
  });

  describe("module level", () => {
    test("should merge app-level and module-level decorators", async () => {
      async function helloModule(app: App) {
        app.register(interceptor.response((body) => ({ decorator: "level1", body })));
        app.get("/hello", () => ({ message: "world" }));
      }

      app.register(interceptor.response((res) => ({ decorated: true, data: res })));
      app.register(helloModule);

      const res = await app.inject("/hello");
      expect(res.body).toBe(
        JSON.stringify({
          decorator: "level1",
          body: {
            decorated: true,
            data: { message: "world" },
          },
        })
      );
    });

    test("should not apply module decorators to routes in other modules", async () => {
      async function moduleWithDecorator(app: App) {
        app.register(interceptor.response((body) => ({ decorated: "YES", data: body })));
        app.get("/decorated", () => ({ text: "should be decorated" }));
      }

      async function moduleWithoutDecorator(app: App) {
        app.get("/plain", () => ({ text: "should be plain" }));
      }

      app.register(moduleWithDecorator);
      app.register(moduleWithoutDecorator);

      const decorated = await app.inject("/decorated");
      expect(decorated.body).toBe(
        JSON.stringify({
          decorated: "YES",
          data: { text: "should be decorated" },
        })
      );

      const plain = await app.inject("/plain");
      expect(plain.body).toBe(JSON.stringify({ text: "should be plain" }));
    });

    test("should ensure module decorators do not conflict across modules", async () => {
      async function moduleA(app: App) {
        app.register(interceptor.response((body) => ({ source: "moduleA", data: body })));
        app.get("/module-a/route1", () => ({ value: "A1" }));
        app.get("/module-a/route2", () => ({ value: "A2" }));
      }

      async function moduleB(app: App) {
        app.register(interceptor.response((body) => ({ source: "moduleB", data: body })));
        app.get("/module-b/route1", () => ({ value: "B1" }));
        app.get("/module-b/route2", () => ({ value: "B2" }));
      }

      async function moduleC(app: App) {
        app.register(interceptor.response((body) => ({ source: "moduleC", data: body })));
        app.get("/module-c/route1", () => ({ value: "C1" }));
      }

      app.register(moduleA);
      app.register(moduleB);
      app.register(moduleC);

      const a1 = await app.inject("/module-a/route1");
      expect(a1.body).toBe(JSON.stringify({ source: "moduleA", data: { value: "A1" } }));

      const a2 = await app.inject("/module-a/route2");
      expect(a2.body).toBe(JSON.stringify({ source: "moduleA", data: { value: "A2" } }));

      const b1 = await app.inject("/module-b/route1");
      expect(b1.body).toBe(JSON.stringify({ source: "moduleB", data: { value: "B1" } }));

      const b2 = await app.inject("/module-b/route2");
      expect(b2.body).toBe(JSON.stringify({ source: "moduleB", data: { value: "B2" } }));

      const c1 = await app.inject("/module-c/route1");
      expect(c1.body).toBe(JSON.stringify({ source: "moduleC", data: { value: "C1" } }));
    });

    test("should handle multi-module scenario with nested decorators", async () => {
      async function testModule(app: App) {
        app.register(interceptor.response((body) => ({ module: true, data: body })));
        app.get("/test", () => ({ message: "Test response" }));
      }

      app.register(interceptor.response((res) => ({ app: true, data: res })));
      app.register(testModule);

      const res = await app.inject("/test");
      expect(res.body).toBe(
        JSON.stringify({
          module: true,
          data: {
            app: true,
            data: { message: "Test response" },
          },
        })
      );
    });
  });
});

describe("interceptor.use", () => {
  let app: App;
  beforeEach(() => {
    app = createApp();
  });
  afterEach(() => app.close());
  test("should call middleware function", async () => {
    const hello = jest.fn<() => Promise<void>>().mockReturnValue(Promise.resolve());
    app.register(interceptor.use(async () => hello()));
    app.get("/", () => {
      return "hello";
    });
    await app.inject("/");
    expect(hello).toHaveBeenCalled();
  });

  test("should call middleware function on specific route", async () => {
    const hello = jest.fn<() => Promise<void>>().mockReturnValue(Promise.resolve());
    app.register(
      interceptor.use(async () => hello()),
      { filter: () => context().route?.path === "/hello" }
    );
    app.get("/", () => {
      return "home";
    });
    app.get("/hello", () => {
      return "hello";
    });
    await app.inject("/");
    expect(hello).not.toHaveBeenCalled();
    await app.inject("/hello");
    expect(hello).toHaveBeenCalled();
  });
});

describe("interceptor.error", () => {
  let app: App;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => app.close());

  test("should decorate error response", async () => {
    app.register(
      interceptor.error((error) => {
        if (!(error instanceof Error)) throw error;
        return { success: false, error: error.message };
      })
    );
    app.get("/", () => abort("Something went wrong"));

    const res = await app.inject("/");
    expect(res.status).toBe(200);
    expect(res.body).toBe(
      JSON.stringify({
        success: false,
        error: "Something went wrong",
      })
    );
  });

  test("should chain multiple decorators", async () => {
    app.register(
      interceptor.error((error) => {
        if (!(error instanceof Error)) throw error;
        return { step1: true, error: error.message };
      })
    );
    app.register(
      interceptor.error((_error, body) => {
        return { step2: true, data: body };
      })
    );
    app.get("/", () => abort("Error message"));

    const res = await app.inject("/");
    expect(res.body).toBe(
      JSON.stringify({
        step2: true,
        data: { step1: true, error: "Error message" },
      })
    );
  });

  test("should handle module-level decorators without conflicts", async () => {
    async function moduleA(app: App) {
      app.register(
        interceptor.error((error) => {
          if (!(error instanceof Error)) throw error;
          return { source: "moduleA", error: error.message };
        })
      );
      app.get("/a", () => abort("A error"));
    }

    async function moduleB(app: App) {
      app.register(
        interceptor.error((error) => {
          if (!(error instanceof Error)) throw error;
          return { source: "moduleB", error: error.message };
        })
      );
      app.get("/b", () => abort("B error"));
    }

    app.register(moduleA);
    app.register(moduleB);

    const a = await app.inject("/a");
    expect(a.body).toBe(JSON.stringify({ source: "moduleA", error: "A error" }));

    const b = await app.inject("/b");
    expect(b.body).toBe(JSON.stringify({ source: "moduleB", error: "B error" }));
  });

  test("should merge app and module decorators in correct order", async () => {
    async function testModule(app: App) {
      app.register(interceptor.error((_error, body) => ({ module: true, data: body })));
      app.get("/test", () => abort("Test error"));
    }

    app.register(
      interceptor.error((error) => {
        if (!(error instanceof Error)) throw error;
        return { app: true, error: error.message };
      })
    );
    app.register(testModule);

    const res = await app.inject("/test");
    expect(res.body).toBe(
      JSON.stringify({
        module: true,
        data: { app: true, error: "Test error" },
      })
    );
  });

  test("should handle decorator with filter option", async () => {
    app.register(
      interceptor.error((error) => {
        if (!(error instanceof Error)) throw error;
        return { filtered: true, error: error.message };
      }),
      {
        filter({ req }) {
          return req.url !== "/skip";
        },
      }
    );

    app.get("/apply", () => abort("Apply error"));
    app.get("/skip", () => abort("Skip error"));

    const apply = await app.inject("/apply");
    expect(apply.body).toBe(JSON.stringify({ filtered: true, error: "Apply error" }));

    const skip = await app.inject("/skip");
    expect(skip.body).toBe(JSON.stringify({ message: "Skip error" }));
  });

  test("should preserve status code from HttpError", async () => {
    app.register(
      interceptor.error((error) => {
        if (!(error instanceof Error)) throw error;
        if (abort.is(error)) {
          abort({ custom: true, message: error.message }, error.statusCode);
        }
        abort("Unknown error", 500);
      })
    );

    app.get("/", () => abort("Not found", 404));

    const res = await app.inject("/");
    expect(res.status).toBe(404);
    expect(res.body).toBe(JSON.stringify({ custom: true, message: "Not found" }));
  });
});
