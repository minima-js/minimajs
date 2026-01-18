import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import type { Server } from "node:http";
import { compose } from "./compose.js";
import { plugin } from "./plugin.js";
import { hook } from "./hooks/index.js";
import { createApp } from "./node/index.js";
import { createRequest } from "./mock/request.js";
import type { App } from "./interfaces/index.js";
import type { PluginOptions } from "./plugin.js";

describe("compose", () => {
  let app: App<Server>;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app?.close());

  test("should compose multiple sync plugins", async () => {
    const plugin1 = jest.fn();
    const plugin2 = jest.fn();

    const p1 = plugin(() => {
      plugin1();
    });

    const p2 = plugin(() => {
      plugin2();
    });

    app.register(compose(p1, p2));

    await app.ready();

    expect(plugin1).toHaveBeenCalled();
    expect(plugin2).toHaveBeenCalled();
  });

  test("should compose multiple async plugins", async () => {
    const plugin1 = jest.fn();
    const plugin2 = jest.fn();

    const p1 = plugin(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      plugin1();
    });

    const p2 = plugin(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      plugin2();
    });

    app.register(compose(p1, p2));

    await app.ready();

    expect(plugin1).toHaveBeenCalled();
    expect(plugin2).toHaveBeenCalled();
  });

  test("should compose sync and async plugins together", async () => {
    const syncCalled = jest.fn();
    const asyncCalled = jest.fn();

    const syncPlugin = plugin(() => {
      syncCalled();
    });

    const asyncPlugin = plugin(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      asyncCalled();
    });

    app.register(compose(syncPlugin, asyncPlugin));

    await app.ready();

    expect(syncCalled).toHaveBeenCalled();
    expect(asyncCalled).toHaveBeenCalled();
  });

  test("should execute plugins in order", async () => {
    const callOrder: number[] = [];

    const p1 = plugin(() => {
      callOrder.push(1);
    });

    const p2 = plugin(() => {
      callOrder.push(2);
    });

    app.register(compose(p1, p2));

    await app.ready();

    expect(callOrder).toEqual([1, 2]);
  });

  test("should propagate errors from composed plugins", async () => {
    const normalPlugin = plugin(() => {});
    const errorPlugin = plugin(() => {
      throw new Error("Plugin error");
    });

    app.register(compose(normalPlugin, errorPlugin));

    await expect(app.ready()).rejects.toThrow("Plugin error");
  });

  test("should stop execution when a plugin throws", async () => {
    const firstCalled = jest.fn();
    const afterErrorCalled = jest.fn();

    const normalPlugin = plugin(() => {
      firstCalled();
    });

    const errorPlugin = plugin(() => {
      throw new Error("Stop here");
    });

    const afterError = plugin(() => {
      afterErrorCalled();
    });

    app.register(compose(normalPlugin, errorPlugin, afterError));

    await expect(app.ready()).rejects.toThrow("Stop here");
    expect(firstCalled).toHaveBeenCalled();
    expect(afterErrorCalled).not.toHaveBeenCalled();
  });

  test("should compose three or more plugins", async () => {
    const calls: string[] = [];

    const p1 = plugin(() => {
      calls.push("p1");
    });
    const p2 = plugin(() => {
      calls.push("p2");
    });
    const p3 = plugin(() => {
      calls.push("p3");
    });

    app.register(compose(p1, p2, p3));

    await app.ready();

    expect(calls).toEqual(["p1", "p2", "p3"]);
  });

  test("should compose single plugin", async () => {
    const called = jest.fn();
    const p1 = plugin(() => {
      called();
    });

    app.register(compose(p1));

    await app.ready();

    expect(called).toHaveBeenCalled();
  });

  test("should allow nesting composed plugins", async () => {
    const calls: string[] = [];

    const p1 = plugin(() => {
      calls.push("p1");
    });
    const p2 = plugin(() => {
      calls.push("p2");
    });
    const p3 = plugin(() => {
      calls.push("p3");
    });

    const composed1 = compose(p1, p2);
    const composed2 = compose(composed1, p3);

    app.register(composed2);

    await app.ready();

    expect(calls).toEqual(["p1", "p2", "p3"]);
  });

  test("should pass options to all composed plugins", async () => {
    const opts1: any = {};
    const opts2: any = {};

    const p1 = plugin((_, o) => {
      Object.assign(opts1, o);
    });

    const p2 = plugin((_, o) => {
      Object.assign(opts2, o);
    });

    app.register(compose(p1, p2), { customOption: "test" });

    await app.ready();

    expect(opts1.customOption).toBe("test");
    expect(opts2.customOption).toBe("test");
  });

  test("should compose hooks together", async () => {
    let dbConnected = false;
    let dbClosed = false;

    const connectDB = hook("ready", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      dbConnected = true;
    });

    const closeDB = hook("close", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(dbConnected).toBe(true);
      dbClosed = true;
    });

    app.register(compose(connectDB, closeDB));

    await app.ready();
    expect(dbConnected).toBe(true);
    expect(dbClosed).toBe(false);

    await app.close();
    expect(dbClosed).toBe(true);
  });

  test("should have descriptive name for composed plugin", () => {
    const p1 = plugin(() => {}, "plugin1");
    const p2 = plugin(() => {}, "plugin2");

    const composed = compose(p1, p2);

    expect(composed.name).toBe("composed");
  });

  test("should work with route registration in composed plugins", async () => {
    const p1 = plugin((app) => {
      app.get("/test1", () => ({ route: "test1" }));
    });

    const p2 = plugin((app) => {
      app.get("/test2", () => ({ route: "test2" }));
    });

    app.register(compose(p1, p2));

    const response1 = await app.handle(createRequest("/test1"));
    const data1 = await response1.json();
    expect(data1).toEqual({ route: "test1" });

    const response2 = await app.handle(createRequest("/test2"));
    const data2 = await response2.json();
    expect(data2).toEqual({ route: "test2" });
  });

  test("should compose feature modules", async () => {
    const authCalled = jest.fn();
    const usersCalled = jest.fn();
    const postsCalled = jest.fn();

    const authModule = plugin((app) => {
      authCalled();
      app.get("/auth", () => ({ module: "auth" }));
    });

    const usersModule = plugin((app) => {
      usersCalled();
      app.get("/users", () => ({ module: "users" }));
    });

    const postsModule = plugin((app) => {
      postsCalled();
      app.get("/posts", () => ({ module: "posts" }));
    });

    const apiModule = compose(authModule, usersModule, postsModule);

    app.register(apiModule);

    await app.ready();

    expect(authCalled).toHaveBeenCalled();
    expect(usersCalled).toHaveBeenCalled();
    expect(postsCalled).toHaveBeenCalled();

    const authRes = await app.handle(createRequest("/auth"));
    expect(await authRes.json()).toEqual({ module: "auth" });

    const usersRes = await app.handle(createRequest("/users"));
    expect(await usersRes.json()).toEqual({ module: "users" });

    const postsRes = await app.handle(createRequest("/posts"));
    expect(await postsRes.json()).toEqual({ module: "posts" });
  });

  describe("compose.create", () => {
    test("should create a higher-order function that applies plugins to a module", async () => {
      const authCalled = jest.fn();
      const loggingCalled = jest.fn();
      const moduleCalled = jest.fn();

      const authPlugin = plugin(() => {
        authCalled();
      });

      const loggingPlugin = plugin(() => {
        loggingCalled();
      });

      const withPlugins = compose.create(authPlugin, loggingPlugin);

      const myModule = plugin(() => {
        moduleCalled();
      });

      app.register(withPlugins(myModule));

      await app.ready();

      expect(authCalled).toHaveBeenCalled();
      expect(loggingCalled).toHaveBeenCalled();
      expect(moduleCalled).toHaveBeenCalled();
    });

    test("should execute plugins in order: plugins first, then module", async () => {
      const callOrder: string[] = [];

      const pluginA = plugin(() => {
        callOrder.push("pluginA");
      });
      const pluginB = plugin(() => {
        callOrder.push("pluginB");
      });

      const withPlugins = compose.create(pluginA, pluginB);

      const myModule = plugin(() => {
        callOrder.push("module");
      });

      app.register(withPlugins(myModule));

      await app.ready();

      expect(callOrder).toEqual(["module", "pluginA", "pluginB"]);
    });

    test("should allow reusing the same composer for multiple modules", async () => {
      const pluginCalls: string[] = [];
      const module1Calls: string[] = [];
      const module2Calls: string[] = [];

      const sharedPlugin = plugin(() => {
        pluginCalls.push("shared");
      });

      const withShared = compose.create(sharedPlugin);

      const module1 = plugin(() => {
        module1Calls.push("module1");
      });

      const module2 = plugin(() => {
        module2Calls.push("module2");
      });

      app.register(withShared(module1));
      app.register(withShared(module2));

      await app.ready();

      expect(pluginCalls).toEqual(["shared", "shared"]);
      expect(module1Calls).toEqual(["module1"]);
      expect(module2Calls).toEqual(["module2"]);
    });

    test("should work with route registration", async () => {
      const authPlugin = plugin((app) => {
        app.get("/auth-check", () => ({ authenticated: true }));
      });

      const withAuth = compose.create(authPlugin);

      const usersModule = plugin((app) => {
        app.get("/users", () => ({ users: [] }));
      });

      app.register(withAuth(usersModule));

      const authRes = await app.handle(createRequest("/auth-check"));
      expect(await authRes.json()).toEqual({ authenticated: true });

      const usersRes = await app.handle(createRequest("/users"));
      expect(await usersRes.json()).toEqual({ users: [] });
    });

    test("should compose multiple plugins with hooks", async () => {
      let setupCalled = false;
      let cleanupCalled = false;
      let moduleCalled = false;

      const setupPlugin = hook("ready", () => {
        setupCalled = true;
      });

      const cleanupPlugin = hook("close", () => {
        cleanupCalled = true;
      });

      const withLifecycle = compose.create(setupPlugin, cleanupPlugin);

      const myModule = plugin(() => {
        moduleCalled = true;
      });

      app.register(withLifecycle(myModule));

      await app.ready();
      expect(setupCalled).toBe(true);
      expect(moduleCalled).toBe(true);
      expect(cleanupCalled).toBe(false);

      await app.close();
      expect(cleanupCalled).toBe(true);
    });

    test("should pass options to all plugins and module", async () => {
      interface CustomOpts extends PluginOptions {
        customValue: string;
      }

      let plugin1Value = "";
      let plugin2Value = "";
      let moduleValue = "";

      const plugin1 = plugin<any, CustomOpts>((_, opts) => {
        plugin1Value = opts.customValue;
      });

      const plugin2 = plugin<any, CustomOpts>((_, opts) => {
        plugin2Value = opts.customValue;
      });

      const withPlugins = compose.create(plugin1, plugin2);

      const myModule = (_: any, opts: CustomOpts) => {
        moduleValue = opts.customValue;
      };

      app.register(withPlugins(myModule), { customValue: "test-value" });

      await app.ready();

      expect(plugin1Value).toBe("test-value");
      expect(plugin2Value).toBe("test-value");
      expect(moduleValue).toBe("test-value");
    });

    test("should allow chaining multiple composers", async () => {
      const calls: string[] = [];

      const authPlugin = plugin(() => {
        calls.push("auth");
      });
      const loggingPlugin = plugin(() => {
        calls.push("logging");
      });
      const cachingPlugin = plugin(() => {
        calls.push("caching");
      });

      const withAuth = compose.create(authPlugin);
      const withLogging = compose.create(loggingPlugin);
      const withCaching = compose.create(cachingPlugin);

      const myModule = plugin(() => {
        calls.push("module");
      });

      // Chain composers
      app.register(withAuth(withLogging(withCaching(myModule))));

      await app.ready();

      expect(calls).toEqual(["module", "auth", "logging", "caching"]);
    });

    test("should handle errors in plugins before module", async () => {
      const errorPlugin = plugin(() => {
        throw new Error("Plugin error");
      });

      const withError = compose.create(errorPlugin);

      const myModule = plugin(() => {
        // Should not be called
      });

      app.register(withError(myModule));

      await expect(app.ready()).rejects.toThrow("Plugin error");
    });

    test("should create descriptive composed module", () => {
      const plugin1 = plugin(() => {}, "plugin1");
      const plugin2 = plugin(() => {}, "plugin2");
      const myModule = plugin(() => {}, "myModule");

      const withPlugins = compose.create(plugin1, plugin2);
      const composedModule = withPlugins(myModule);
      expect(plugin.is(composedModule)).toBeTruthy();
      expect(composedModule.name).toBe("composed");
    });

    test("should work with complex real-world scenario", async () => {
      const calls: string[] = [];
      const routes: string[] = [];

      // Middleware plugins
      const corsPlugin = plugin(() => {
        calls.push("cors");
      });

      const authPlugin = plugin(() => {
        calls.push("auth");
      });

      const rateLimitPlugin = plugin(() => {
        calls.push("rateLimit");
      });

      // Create composer with standard middleware
      const withStandardMiddleware = compose.create(corsPlugin, authPlugin, rateLimitPlugin);

      // Users module
      const usersModule = (app: App) => {
        calls.push("usersModule");
        app.get("/users", () => {
          routes.push("users");
          return { users: [] };
        });
      };

      // Posts module
      const postsModule = (app: App) => {
        calls.push("postsModule");
        app.get("/posts", () => {
          routes.push("posts");
          return { posts: [] };
        });
      };

      // Apply middleware to both modules
      const usersModulePacked = withStandardMiddleware(usersModule);
      expect(plugin.is(usersModulePacked)).toBeFalsy();
      app.register(usersModulePacked);

      const postsModulePacked = withStandardMiddleware(postsModule);
      expect(plugin.is(postsModulePacked)).toBeFalsy();
      app.register(postsModulePacked);

      await app.ready();

      // Verify setup order
      expect(calls).toEqual(["usersModule", "cors", "auth", "rateLimit", "postsModule", "cors", "auth", "rateLimit"]);

      // Verify routes work
      await app.handle(createRequest("/users"));
      await app.handle(createRequest("/posts"));

      expect(routes).toEqual(["users", "posts"]);
    });
  });
});
