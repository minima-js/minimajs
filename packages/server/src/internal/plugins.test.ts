import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { plugin } from "./plugins.js";
import { createApp } from "../bun/index.js";
import type { App } from "../interfaces/app.js";
import { kPluginName, kPluginSkipOverride } from "../symbols.js";
import { createRequest } from "../mock/request.js";

describe("plugins", () => {
  describe("createPlugin", () => {
    test("it should set override and accept a async function", () => {
      const p: any = plugin(async (_, __) => {});
      expect(p[kPluginSkipOverride]).toBeTruthy();
    });
    test("it should set override and accept a async function set a name", () => {
      const p: any = plugin(async (_, __) => {}, "hello world");
      expect(p[kPluginSkipOverride]).toBeTruthy();
      expect(p[kPluginName]).toBeTruthy();
    });
  });

  describe("compose", () => {
    let app: App;

    beforeEach(() => {
      app = createApp({ logger: false });
    });

    afterEach(() => app?.close());

    test("should compose multiple sync plugins", async () => {
      const plugin1 = jest.fn();
      const plugin2 = jest.fn();

      const p1 = plugin((_app) => {
        plugin1();
      });

      const p2 = plugin((_app) => {
        plugin2();
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

      const syncPlugin = plugin((_app) => {
        syncCalled();
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
      const p1 = plugin((app) => {
        app.get("/route1", () => "route1");
      });

      const p2 = plugin((app) => {
        app.get("/route2", () => "route2");
      });

      app.register(plugin.compose(p1, p2));

      await app.ready();

      const res1 = await app.inject(createRequest("/route1"));
      const res2 = await app.inject(createRequest("/route2"));

      expect(await res1.text()).toBe("route1");
      expect(await res2.text()).toBe("route2");
    });

    test("should handle async plugin errors", async () => {
      const errorPlugin = plugin(async (_app, _opts) => {
        throw new Error("Plugin error");
      });

      const normalPlugin = plugin((_app) => {});

      app.register(plugin.compose(normalPlugin, errorPlugin));

      await expect(app.ready()).rejects.toThrow("Plugin error");
    });

    test("should handle sync plugin errors", async () => {
      const errorPlugin = plugin((_app) => {
        throw new Error("Sync plugin error");
      });

      const normalPlugin = plugin((_app) => {});

      app.register(plugin.compose(normalPlugin, errorPlugin));

      await expect(app.ready()).rejects.toThrow("Sync plugin error");
    });

    test("should execute plugins in order", async () => {
      const executionOrder: number[] = [];

      const p1 = plugin((_app) => {
        executionOrder.push(1);
      });

      const p2 = plugin((_app) => {
        executionOrder.push(2);
      });

      const p3 = plugin((_app) => {
        executionOrder.push(3);
      });

      app.register(plugin.compose(p1, p2, p3));

      await app.ready();

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    test.skip("should handle empty plugin list", async () => {
      app.register(plugin.compose());

      await expect(app.ready()).resolves.not.toThrow();
    });

    test("should work with single plugin", async () => {
      const singleCalled = jest.fn();

      const p1 = plugin((_app) => {
        singleCalled();
      });

      app.register(plugin.compose(p1));

      await app.ready();

      expect(singleCalled).toHaveBeenCalled();
    });

    test("should handle nested composition", async () => {
      const plugin1 = jest.fn();
      const plugin2 = jest.fn();
      const plugin3 = jest.fn();

      const p1 = plugin((_app) => {
        plugin1();
      });

      const p2 = plugin((_app) => {
        plugin2();
      });

      const p3 = plugin((_app) => {
        plugin3();
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

      const p1 = plugin((_app, opts) => {
        receivedOpts.push(opts);
      });

      const p2 = plugin((_app, opts) => {
        receivedOpts.push(opts);
      });

      app.register(plugin.compose(p1, p2));

      await app.ready();

      expect(receivedOpts).toHaveLength(2);
      // Options are passed through from register call (empty in this case)
      expect(receivedOpts[0]).toMatchObject({});
      expect(receivedOpts[1]).toMatchObject({});
    });

    test("should handle async execution order", async () => {
      const executionOrder: string[] = [];

      const p1 = plugin(async (_app, _opts) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        executionOrder.push("async1");
      });

      const p2 = plugin((_app) => {
        executionOrder.push("sync");
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
