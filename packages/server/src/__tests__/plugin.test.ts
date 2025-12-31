import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "../bun/index.js";
import type { Server } from "../bun/server.js";
import { plugin } from "../internal/plugins.js";

describe("Plugin System", () => {
  let app: Server<any>;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should register sync plugin", async () => {
    let pluginCalled = false;

    app.register((instance) => {
      pluginCalled = true;
      instance.get("/plugin-route", () => ({ fromPlugin: true }));
    });

    await app.ready();
    expect(pluginCalled).toBe(true);

    const response = await app.inject("/plugin-route");
    const data = (await response.json()) as any;
    expect(data.fromPlugin).toBe(true);
  });

  it("should register async plugin", async () => {
    let pluginCalled = false;

    app.register(async (instance) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      pluginCalled = true;
      instance.get("/async-route", () => ({ async: true }));
    });

    await app.ready();
    expect(pluginCalled).toBe(true);

    const response = await app.inject("/async-route");
    const data = (await response.json()) as any;
    expect(data.async).toBe(true);
  });

  it("should register plugin with options", async () => {
    app.register<{ name: string }>(
      async (instance, opts) => {
        instance.get("/greeting", () => ({ message: `Hello ${opts.name}` }));
      },
      { name: "World" }
    );

    await app.ready();

    const response = await app.inject("/greeting");
    const data = (await response.json()) as any;
    expect(data.message).toBe("Hello World");
  });

  describe("Nested Plugins", () => {
    it("should handle nested sync plugins", async () => {
      const order: string[] = [];

      const child = plugin((app) => {
        order.push("child");
        app.get("/child", () => ({ route: "child" }));
      });

      const parent = plugin((app) => {
        order.push("parent-start");
        app.register(child);
        order.push("parent-end");
      });

      app.register(parent);
      await app.ready();

      expect(order).toEqual(["parent-start", "parent-end", "child"]);

      const response = await app.inject("/child");
      const data = (await response.json()) as any;
      expect(data.route).toBe("child");
    });

    it("should handle nested async plugins with delays", async () => {
      const order: string[] = [];
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const child = plugin(async (app) => {
        await sleep(10);
        order.push("child");
        app.get("/async-child", () => ({ route: "async-child" }));
      });

      const parent = plugin(async (app) => {
        order.push("parent-start");
        await sleep(5);
        app.register(child);
        order.push("parent-end");
      });

      app.register(parent);
      await app.ready();

      expect(order).toEqual(["parent-start", "parent-end", "child"]);

      const response = await app.inject("/async-child");
      const data = (await response.json()) as any;
      expect(data.route).toBe("async-child");
    });

    it("should handle mixed sync and async nested plugins", async () => {
      const order: string[] = [];
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const asyncChild = plugin(async (_app) => {
        await sleep(10);
        order.push("async-child");
      });

      const syncChild = plugin((_app) => {
        order.push("sync-child");
      });

      const parent = plugin(async (app) => {
        order.push("parent-start");
        app.register(syncChild);
        app.register(asyncChild);
        order.push("parent-end");
      });

      app.register(parent);
      await app.ready();

      expect(order).toEqual(["parent-start", "parent-end", "sync-child", "async-child"]);
    });

    it("should handle deeply nested plugins (3 levels)", async () => {
      const order: string[] = [];
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const grandchild = plugin(async (app) => {
        await sleep(5);
        order.push("grandchild");
        app.get("/deep", () => ({ level: 3 }));
      });

      const child = plugin(async (app) => {
        await sleep(5);
        order.push("child-start");
        app.register(grandchild);
        order.push("child-end");
      });

      const parent = plugin(async (app) => {
        order.push("parent-start");
        app.register(child);
        order.push("parent-end");
      });

      app.register(parent);
      await app.ready();

      expect(order).toEqual(["parent-start", "parent-end", "child-start", "child-end", "grandchild"]);

      const response = await app.inject("/deep");
      const data = (await response.json()) as any;
      expect(data.level).toBe(3);
    });

    it("should handle nested plugins with prefix override", async () => {
      const child = plugin(async (app) => {
        app.get("/route", () => ({ scope: "child" }));
      });

      const parent = plugin(async (app, _opts) => {
        app.register(child, { prefix: "/child" });
        app.get("/route", () => ({ scope: "parent" }));
      }, "parent");

      app.register(parent, { prefix: "/api" });
      await app.ready();

      const parentRes = await app.inject("/api/route");
      const parentData = (await parentRes.json()) as any;
      expect(parentData.scope).toBe("parent");

      const childRes = await app.inject("/api/child/route");
      const childData = (await childRes.json()) as any;
      expect(childData.scope).toBe("child");
    });

    it("should handle nested plugins without override (skip-override)", async () => {
      const noOverrideChild = plugin(async (app) => {
        app.get("/child", () => ({ override: false }));
      });

      const parent = plugin(async (app) => {
        app.register(noOverrideChild);
        app.get("/parent", () => ({ route: "parent" }));
      });

      app.register(parent, { prefix: "/v1" });
      await app.ready();

      // plugin() sets skip-override: true, so child inherits parent prefix
      const childRes = await app.inject("/v1/child");
      const childData = (await childRes.json()) as any;
      expect(childData.override).toBe(false);

      const parentRes = await app.inject("/v1/parent");
      const parentData = (await parentRes.json()) as any;
      expect(parentData.route).toBe("parent");
    });

    it("should handle parallel nested async plugins", async () => {
      const order: string[] = [];
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const child1 = plugin(async (_app) => {
        await sleep(20);
        order.push("child1");
      });

      const child2 = plugin(async (_app) => {
        await sleep(10);
        order.push("child2");
      });

      const parent = plugin(async (app) => {
        order.push("parent");
        app.register(child1);
        app.register(child2);
      });

      app.register(parent);
      await app.ready();

      // Plugins registered in parent execute sequentially
      expect(order).toEqual(["parent", "child1", "child2"]);
    });
  });
});
