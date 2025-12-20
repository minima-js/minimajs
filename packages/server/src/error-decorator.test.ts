import { createApp, type App, abort } from "./index.js";
import { createErrorDecorator } from "./error.js";

describe("createErrorDecorator", () => {
  let app: App;

  beforeEach(() => {
    app = createApp({ routes: { log: false } });
  });

  afterEach(() => app.close());

  test("should decorate error response", async () => {
    app.register(
      createErrorDecorator((error) => {
        if (!(error instanceof Error)) throw error;
        return { success: false, error: error.message };
      })
    );
    app.get("/", () => abort("Something went wrong"));

    const res = await app.inject({ url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(
      JSON.stringify({
        success: false,
        error: "Something went wrong",
      })
    );
  });

  test("should chain multiple decorators", async () => {
    app.register(
      createErrorDecorator((error) => {
        if (!(error instanceof Error)) throw error;
        return { step1: true, error: error.message };
      })
    );
    app.register(
      createErrorDecorator((_error, body) => {
        return { step2: true, data: body };
      })
    );
    app.get("/", () => abort("Error message"));

    const res = await app.inject({ url: "/" });
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
        createErrorDecorator((error) => {
          if (!(error instanceof Error)) throw error;
          return { source: "moduleA", error: error.message };
        })
      );
      app.get("/a", () => abort("A error"));
    }

    async function moduleB(app: App) {
      app.register(
        createErrorDecorator((error) => {
          if (!(error instanceof Error)) throw error;
          return { source: "moduleB", error: error.message };
        })
      );
      app.get("/b", () => abort("B error"));
    }

    app.register(moduleA);
    app.register(moduleB);

    const a = await app.inject({ url: "/a" });
    expect(a.body).toBe(JSON.stringify({ source: "moduleA", error: "A error" }));

    const b = await app.inject({ url: "/b" });
    expect(b.body).toBe(JSON.stringify({ source: "moduleB", error: "B error" }));
  });

  test("should merge app and module decorators in correct order", async () => {
    async function testModule(app: App) {
      app.register(createErrorDecorator((_error, body) => ({ module: true, data: body })));
      app.get("/test", () => abort("Test error"));
    }

    app.register(
      createErrorDecorator((error) => {
        if (!(error instanceof Error)) throw error;
        return { app: true, error: error.message };
      })
    );
    app.register(testModule);

    const res = await app.inject({ url: "/test" });
    expect(res.body).toBe(
      JSON.stringify({
        module: true,
        data: { app: true, error: "Test error" },
      })
    );
  });

  test("should handle decorator with filter option", async () => {
    app.register(
      createErrorDecorator((error) => {
        if (!(error instanceof Error)) throw error;
        return { filtered: true, error: error.message };
      }),
      {
        filter(req) {
          return req.url !== "/skip";
        },
      }
    );

    app.get("/apply", () => abort("Apply error"));
    app.get("/skip", () => abort("Skip error"));

    const apply = await app.inject({ url: "/apply" });
    expect(apply.body).toBe(JSON.stringify({ filtered: true, error: "Apply error" }));

    const skip = await app.inject({ url: "/skip" });
    expect(skip.body).toBe(JSON.stringify({ message: "Skip error" }));
  });

  test("should preserve status code from HttpError", async () => {
    app.register(
      createErrorDecorator((error) => {
        if (!(error instanceof Error)) throw error;
        if (abort.is(error)) {
          abort({ custom: true, message: error.message }, error.statusCode);
        }
        abort("Unknown error", 500);
      })
    );

    app.get("/", () => abort("Not found", 404));

    const res = await app.inject({ url: "/" });
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe(JSON.stringify({ custom: true, message: "Not found" }));
  });
});
