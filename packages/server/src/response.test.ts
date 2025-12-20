import { createApp, response, type App } from "./index.js";
import { createResponseDecorator } from "./response.js";

describe("response.decorate", () => {
  let app: App;

  beforeEach(() => {
    app = createApp({ logger: false, routes: { log: false } });
  });

  afterEach(() => app.close());

  describe("basic functionality", () => {
    test("should decorate response with simple wrapper", async () => {
      app.register(
        createResponseDecorator((res) => {
          return { decorated: true, data: res };
        })
      );
      app.get("/", () => ({ message: "hello world" }));
      await app.ready();
      const res = await app.inject({ url: "/" });
      expect(res.body).toBe(
        JSON.stringify({
          decorated: true,
          data: { message: "hello world" },
        })
      );
    });

    test("should support async decorator", async () => {
      app.register(
        response.decorate(async (res) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { decorated: true, data: res };
        })
      );
      app.get("/", () => ({ message: "async test" }));

      const res = await app.inject({ url: "/" });
      expect(res.body).toBe(
        JSON.stringify({
          decorated: true,
          data: { message: "async test" },
        })
      );
    });

    test("should chain multiple app-level decorators", async () => {
      app.register(
        response.decorate((res) => {
          return { step1: true, data: res };
        })
      );
      app.register(
        response.decorate((res) => {
          return { step2: true, data: res };
        })
      );
      app.get("/", () => ({ value: "original" }));

      const res = await app.inject({ url: "/" });
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
        app.register(response.decorate((body) => ({ decorator: "level1", body })));
        app.get("/hello", () => ({ message: "world" }));
      }

      app.register(response.decorate((res) => ({ decorated: true, data: res })));
      app.register(helloModule);

      const res = await app.inject({ url: "/hello" });
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
        app.register(response.decorate((body) => ({ decorated: "YES", data: body })));
        app.get("/decorated", () => ({ text: "should be decorated" }));
      }

      async function moduleWithoutDecorator(app: App) {
        app.get("/plain", () => ({ text: "should be plain" }));
      }

      app.register(moduleWithDecorator);
      app.register(moduleWithoutDecorator);

      const decorated = await app.inject({ url: "/decorated" });
      expect(decorated.body).toBe(
        JSON.stringify({
          decorated: "YES",
          data: { text: "should be decorated" },
        })
      );

      const plain = await app.inject({ url: "/plain" });
      expect(plain.body).toBe(JSON.stringify({ text: "should be plain" }));
    });

    test("should ensure module decorators do not conflict across modules", async () => {
      async function moduleA(app: App) {
        app.register(response.decorate((body) => ({ source: "moduleA", data: body })));
        app.get("/module-a/route1", () => ({ value: "A1" }));
        app.get("/module-a/route2", () => ({ value: "A2" }));
      }

      async function moduleB(app: App) {
        app.register(response.decorate((body) => ({ source: "moduleB", data: body })));
        app.get("/module-b/route1", () => ({ value: "B1" }));
        app.get("/module-b/route2", () => ({ value: "B2" }));
      }

      async function moduleC(app: App) {
        app.register(response.decorate((body) => ({ source: "moduleC", data: body })));
        app.get("/module-c/route1", () => ({ value: "C1" }));
      }

      app.register(moduleA);
      app.register(moduleB);
      app.register(moduleC);

      const a1 = await app.inject({ url: "/module-a/route1" });
      expect(a1.body).toBe(JSON.stringify({ source: "moduleA", data: { value: "A1" } }));

      const a2 = await app.inject({ url: "/module-a/route2" });
      expect(a2.body).toBe(JSON.stringify({ source: "moduleA", data: { value: "A2" } }));

      const b1 = await app.inject({ url: "/module-b/route1" });
      expect(b1.body).toBe(JSON.stringify({ source: "moduleB", data: { value: "B1" } }));

      const b2 = await app.inject({ url: "/module-b/route2" });
      expect(b2.body).toBe(JSON.stringify({ source: "moduleB", data: { value: "B2" } }));

      const c1 = await app.inject({ url: "/module-c/route1" });
      expect(c1.body).toBe(JSON.stringify({ source: "moduleC", data: { value: "C1" } }));
    });

    test("should handle multi-module scenario with nested decorators", async () => {
      async function testModule(app: App) {
        app.register(response.decorate((body) => ({ module: true, data: body })));
        app.get("/test", () => ({ message: "Test response" }));
      }

      app.register(response.decorate((res) => ({ app: true, data: res })));
      app.register(testModule);

      const res = await app.inject({ url: "/test" });
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
