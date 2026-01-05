import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "../bun/index.js";
import type { Server } from "../core/index.js";
import { plugin } from "../internal/plugins.js";
import { getBody, sleep } from "./helpers/index.js";
import type { App } from "../interfaces/index.js";
import { createRequest } from "../mock/request.js";

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

  test("should register sync plugin", async () => {
    let pluginCalled = false;

    app.register((instance) => {
      pluginCalled = true;
      instance.get("/plugin-route", () => ({ fromPlugin: true }));
      expect(instance).not.toBe(app);
    });

    await app.ready();
    expect(pluginCalled).toBe(true);

    const response = await app.inject(createRequest("/plugin-route"));
    const data = await getBody(response);
    expect(data.fromPlugin).toBe(true);
  });

  test("should register async plugin", async () => {
    let pluginCalled = false;
    let nestedCalled = false;

    app.register(async (instance) => {
      await sleep(1);
      pluginCalled = true;
      instance.get("/async-route", () => ({ async: true }));
      instance.register(async (nested) => {
        await sleep(1);
        expect(nested).not.toBe(instance);
        expect(nested).not.toBe(app);
        nestedCalled = true;
      });
      expect(instance).not.toBe(app);
    });

    await app.ready();

    expect(pluginCalled).toBe(true);
    expect(nestedCalled).toBe(true);

    const response = await app.inject(createRequest("/async-route"));
    const data = (await response.json()) as any;
    expect(data.async).toBe(true);
  });

  test("should register plugin with options", async () => {
    app.register<{ name: string }>(
      async (instance, opts) => {
        instance.get("/greeting", () => ({ message: `Hello ${opts.name}` }));
      },
      { name: "World" }
    );

    await app.ready();

    const response = await app.inject(createRequest("/greeting"));
    const data = (await response.json()) as any;
    expect(data.message).toBe("Hello World");
  });

  describe("Nested Plugins", () => {
    test("should handle nested sync plugins", async () => {
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

      const response = await app.inject(createRequest("/child"));
      const data = (await response.json()) as any;
      expect(data.route).toBe("child");
    });

    test("should handle nested async plugins with delays", async () => {
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

      const response = await app.inject(createRequest("/async-child"));
      const data = (await response.json()) as any;
      expect(data.route).toBe("async-child");
    });

    test("should handle mixed sync and async nested plugins", async () => {
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

    test("should handle deeply nested plugins (3 levels)", async () => {
      const order: string[] = [];

      const grandchild = plugin(async (gc) => {
        await sleep(5);
        order.push("grandchild");
        gc.get("/deep", () => ({ level: 3 }));
        expect(gc).toBe(app);
      });

      const child = plugin(async (c) => {
        await sleep(5);
        order.push("child-start");
        c.register(grandchild);
        order.push("child-end");
        expect(c).toBe(app);
      });
      const parent = plugin(async (p) => {
        order.push("parent-start");
        p.register(child);
        order.push("parent-end");
        expect(p).toBe(app);
      });

      app.register(parent);
      await app.ready();

      expect(order).toEqual(["parent-start", "parent-end", "child-start", "child-end", "grandchild"]);

      const response = await app.inject(createRequest("/deep"));
      const data = (await response.json()) as any;
      expect(data.level).toBe(3);
    });

    test("should handle nested plugins with prefix override", async () => {
      const child = async (app: App) => {
        app.get("/route", () => ({ scope: "child" }));
      };

      const parent = async (app: App) => {
        app.register(child, { prefix: "/child" });
        app.get("/route", () => ({ scope: "parent" }));
      };

      app.register(parent, { prefix: "/api" });
      await app.ready();

      const parentRes = await app.inject(createRequest("/api/route"));
      const parentData = (await parentRes.json()) as any;
      expect(parentData.scope).toBe("parent");

      const childRes = await app.inject(createRequest("/api/child/route"));
      const childData = (await childRes.json()) as any;
      expect(childData.scope).toBe("child");
    });

    test("should handle nested plugins without override (skip-override)", async () => {
      let parentApp: App;
      const noOverrideChild = plugin(async (noc) => {
        noc.get("/child", () => ({ override: false }));
        expect(noc).toBe(parentApp);
        expect(noc).not.toBe(app);
      });

      const parent = async (pa: App) => {
        parentApp = pa;
        pa.register(noOverrideChild);
        pa.get("/parent", () => ({ route: "parent" }));
      };

      app.register(parent, { prefix: "/v1" });
      await app.ready();

      // plugin() sets skip-override: true, so child inherits parent prefix
      const childRes = await app.inject(createRequest("/v1/child"));
      const childData = (await childRes.json()) as any;
      expect(childData.override).toBe(false);

      const parentRes = await app.inject(createRequest("/v1/parent"));
      const parentData = (await parentRes.json()) as any;
      expect(parentData.route).toBe("parent");
    });

    test("should handle parallel nested async plugins", async () => {
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
