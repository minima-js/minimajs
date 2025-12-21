import { jest } from "@jest/globals";
import { plugin } from "./plugins.js";
import { createApp, type App } from "../index.js";

describe("plugins", () => {
  describe("createPluginSync", () => {
    test("it should have skip override", () => {
      const p: any = plugin.sync((_, __, done) => {
        done();
      });
      expect(p[Symbol.for("skip-override")]).toBeTruthy();
    });

    test("it should have a name", () => {
      const p: any = plugin.sync((_, __, done) => {
        done();
      }, "hello world");
      expect(p[Symbol.for("skip-override")]).toBeTruthy();
      expect(p[Symbol.for("fastify.display-name")]).toBe("hello world");
    });
  });

  describe("createPlugin", () => {
    test("it should set override and accept a async function", () => {
      const p: any = plugin(async (_, __) => {});
      expect(p[Symbol.for("skip-override")]).toBeTruthy();
    });
    test("it should set override and accept a async function set a name", () => {
      const p: any = plugin(async (_, __) => {}, "hello world");
      expect(p[Symbol.for("skip-override")]).toBeTruthy();
      expect(p[Symbol.for("fastify.display-name")]).toBeTruthy();
    });
  });

  describe("compose", () => {
    let app: App;

    beforeEach(() => {
      app = createApp({ logger: false, routes: { log: false } });
    });

    afterEach(() => app?.close());

    test("should compose multiple sync plugins", async () => {
      const plugin1 = jest.fn();
      const plugin2 = jest.fn();

      const p1 = plugin.sync((_app, _opts, done) => {
        plugin1();
        done();
      });

      const p2 = plugin.sync((_app, _opts, done) => {
        plugin2();
        done();
      });

      app.register(plugin.compose(p1, p2));

      await app.ready();

      expect(plugin1).toHaveBeenCalled();
      expect(plugin2).toHaveBeenCalled();
    });

    test("should compose multiple async plugins", async () => {
      const plugin1Called = jest.fn();
      const plugin2Called = jest.fn();

      const p1 = plugin(async (_app, _opts) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        plugin1Called();
      });

      const p2 = plugin(async (_app, _opts) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        plugin2Called();
      });

      app.register(plugin.compose(p1, p2));

      await app.ready();

      expect(plugin1Called).toHaveBeenCalled();
      expect(plugin2Called).toHaveBeenCalled();
    });

    test("should compose mixed sync and async plugins", async () => {
      const syncCalled = jest.fn();
      const asyncCalled = jest.fn();

      const syncPlugin = plugin.sync((_app, _opts, done) => {
        syncCalled();
        done();
      });

      const asyncPlugin = plugin(async (_app, _opts) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        asyncCalled();
      });

      app.register(plugin.compose(syncPlugin, asyncPlugin));

      await app.ready();

      expect(syncCalled).toHaveBeenCalled();
      expect(asyncCalled).toHaveBeenCalled();
    });

    test("should register routes from composed plugins", async () => {
      const p1 = plugin.sync((app, _opts, done) => {
        app.get("/route1", () => "route1");
        done();
      });

      const p2 = plugin.sync((app, _opts, done) => {
        app.get("/route2", () => "route2");
        done();
      });

      app.register(plugin.compose(p1, p2));

      await app.ready();

      const res1 = await app.inject({ url: "/route1" });
      const res2 = await app.inject({ url: "/route2" });

      expect(res1.body).toBe("route1");
      expect(res2.body).toBe("route2");
    });

    test("should handle async plugin errors", async () => {
      const errorPlugin = plugin(async (_app, _opts) => {
        throw new Error("Plugin error");
      });

      const normalPlugin = plugin.sync((_app, _opts, done) => {
        done();
      });

      app.register(plugin.compose(normalPlugin, errorPlugin));

      await expect(app.ready()).rejects.toThrow("Plugin error");
    });

    test("should handle sync plugin errors", async () => {
      const errorPlugin = plugin.sync((_app, _opts, done) => {
        done(new Error("Sync plugin error"));
      });

      const normalPlugin = plugin.sync((_app, _opts, done) => {
        done();
      });

      app.register(plugin.compose(normalPlugin, errorPlugin));

      await expect(app.ready()).rejects.toThrow("Sync plugin error");
    });

    test("should execute plugins in order", async () => {
      const executionOrder: number[] = [];

      const p1 = plugin.sync((_app, _opts, done) => {
        executionOrder.push(1);
        done();
      });

      const p2 = plugin.sync((_app, _opts, done) => {
        executionOrder.push(2);
        done();
      });

      const p3 = plugin.sync((_app, _opts, done) => {
        executionOrder.push(3);
        done();
      });

      app.register(plugin.compose(p1, p2, p3));

      await app.ready();

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    test("should handle empty plugin list", async () => {
      app.register(plugin.compose());

      await expect(app.ready()).resolves.not.toThrow();
    });

    test("should work with single plugin", async () => {
      const singleCalled = jest.fn();

      const p1 = plugin.sync((_app, _opts, done) => {
        singleCalled();
        done();
      });

      app.register(plugin.compose(p1));

      await app.ready();

      expect(singleCalled).toHaveBeenCalled();
    });

    test("should handle nested composition", async () => {
      const plugin1 = jest.fn();
      const plugin2 = jest.fn();
      const plugin3 = jest.fn();

      const p1 = plugin.sync((_app, _opts, done) => {
        plugin1();
        done();
      });

      const p2 = plugin.sync((_app, _opts, done) => {
        plugin2();
        done();
      });

      const p3 = plugin.sync((_app, _opts, done) => {
        plugin3();
        done();
      });

      const composed1 = plugin.compose(p1, p2);
      const composed2 = plugin.compose(composed1, p3);

      app.register(composed2);

      await app.ready();

      expect(plugin1).toHaveBeenCalled();
      expect(plugin2).toHaveBeenCalled();
      expect(plugin3).toHaveBeenCalled();
    });

    test("should pass options to composed plugins", async () => {
      const receivedOpts: any[] = [];

      const p1 = plugin.sync((_app, opts, done) => {
        receivedOpts.push(opts);
        done();
      });

      const p2 = plugin.sync((_app, opts, done) => {
        receivedOpts.push(opts);
        done();
      });

      app.register(plugin.compose(p1, p2), { prefix: "/test" });

      await app.ready();

      expect(receivedOpts).toHaveLength(2);
      expect(receivedOpts[0]).toEqual({ prefix: "/test" });
      expect(receivedOpts[1]).toEqual({ prefix: "/test" });
    });

    test("should handle async execution order", async () => {
      const executionOrder: string[] = [];

      const p1 = plugin(async (_app, _opts) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        executionOrder.push("async1");
      });

      const p2 = plugin.sync((_app, _opts, done) => {
        executionOrder.push("sync");
        done();
      });

      const p3 = plugin(async (_app, _opts) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        executionOrder.push("async2");
      });

      app.register(plugin.compose(p1, p2, p3));

      await app.ready();

      expect(executionOrder).toEqual(["async1", "sync", "async2"]);
    });
  });
});
