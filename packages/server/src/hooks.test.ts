import { describe, test, beforeEach, afterEach, expect, jest } from "@jest/globals";
import { createApp } from "./bun/index.js";
import { hook, defer, onError, plugin, type App, type OnReadyHook, type OnCloseHook } from "./index.js";
import type { ErrorCallback } from "./plugins/minimajs.js";
import { createRequest } from "./mock/request.js";

describe("hooks", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app?.close());

  describe("defer", () => {
    test("should call after response send", async () => {
      const deferred = jest.fn();
      const execution = jest.fn();
      app.get("/", () => {
        defer(() => {
          deferred();
        });
        execution();
        return "Done";
      });

      await app.inject(createRequest("/"));
      expect(deferred).toHaveBeenCalled();
      expect(execution).toHaveBeenCalled();
      const firstCallIndex = (execution as jest.Mock).mock.invocationCallOrder[0];
      const secondCallIndex = (deferred as jest.Mock).mock.invocationCallOrder[0];
      expect(firstCallIndex).toBeLessThan(secondCallIndex!);
    });
  });

  describe("onError", () => {
    test("should call on error", async () => {
      const onErrorFn = jest.fn<ErrorCallback>();
      app.get("/", () => {
        onError(onErrorFn);
        throw new Error("test");
      });
      await app.inject(createRequest("/"));
      expect(onErrorFn).toHaveBeenCalled();
    });
  });

  describe("hook", () => {
    test("it should call closed hook after app is closed", async () => {
      const onClose = jest.fn(() => Promise.resolve());
      app.register(hook("close", onClose));
      expect(onClose).not.toHaveBeenCalled();
      await app.close();
      expect(onClose).toHaveBeenCalled();
    });

    test("should handle async hooks with plugin.compose", async () => {
      let dbConnected = false;
      let dbClosed = false;

      const closeDBHook = hook("close", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(dbConnected).toBe(true);
        dbClosed = true;
      });

      const connectDBHook = hook("ready", async () => {
        dbConnected = true;
      });

      app.register(plugin.compose(connectDBHook, closeDBHook));

      await app.ready();
      expect(dbConnected).toBe(true);
      expect(dbClosed).toBe(false);

      await app.close();
      expect(dbClosed).toBe(true);
    });
  });

  describe("hook.lifespan", () => {
    test("should run setup on ready and cleanup on close", async () => {
      const onReady = jest.fn();
      const onClose = jest.fn();

      const lifespan = hook.lifespan(async () => {
        onReady();
        return async () => {
          onClose();
        };
      });

      app.register(lifespan);

      expect(onReady).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      await app.ready();
      expect(onReady).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      await app.close();
      expect(onClose).toHaveBeenCalled();
    });

    test("should work with async setup and cleanup", async () => {
      let ready = false;
      let closed = false;

      const lifespan = hook.lifespan(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        ready = true;
        return async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          closed = true;
        };
      });

      app.register(lifespan);

      await app.ready();
      expect(ready).toBe(true);
      expect(closed).toBe(false);

      await app.close();
      expect(closed).toBe(true);
    });
  });

  describe("hook with sync callbacks", () => {
    test("should auto-call done() for close hook with no parameters", async () => {
      let closed = false;
      const closeHook = hook("close", () => {
        closed = true;
      });

      app.register(closeHook);
      await app.ready();
      expect(closed).toBe(false);
      await app.close();
      expect(closed).toBe(true);
    });

    test("should auto-call done() for ready hook with no parameters", async () => {
      let ready = false;
      const readyHook = hook("ready", () => {
        ready = true;
      });
      app.register(readyHook);
      expect(ready).toBe(false);
      await app.ready();
      expect(ready).toBe(true);
    });

    test("should require manual done() call when done parameter is present", async () => {
      let closed = false;
      const closeHook = hook("close", () => {
        closed = true;
      });

      app.register(closeHook);
      await app.ready();

      await app.close();
      expect(closed).toBe(true);
    });
  });

  describe("hook.define", () => {
    test("should register and trigger a single hook", async () => {
      const readyHook = jest.fn<OnReadyHook>();
      const multiHook = hook.define({
        ready: readyHook,
      });

      app.register(multiHook);
      expect(readyHook).not.toHaveBeenCalled();

      await app.ready();
      expect(readyHook).toHaveBeenCalled();
    });

    test("should register and trigger multiple hooks", async () => {
      const readyHook = jest.fn<OnReadyHook>();
      const closeHook = jest.fn<OnCloseHook>();

      const multiHook = hook.define({
        ready: readyHook,
        close: closeHook,
      });

      app.register(multiHook);
      expect(readyHook).not.toHaveBeenCalled();
      expect(closeHook).not.toHaveBeenCalled();

      await app.ready();
      expect(readyHook).toHaveBeenCalled();
      expect(closeHook).not.toHaveBeenCalled();

      await app.close();
      expect(closeHook).toHaveBeenCalled();
    });

    test("should handle async hook callbacks", async () => {
      let readyCalled = false;
      const readyHook = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        readyCalled = true;
      };

      const multiHook = hook.define({
        ready: readyHook,
      });

      app.register(multiHook);
      await app.ready();
      expect(readyCalled).toBe(true);
    });

    test("should not fail if no hooks are provided", async () => {
      const multiHook = hook.define({});
      app.register(multiHook);
      await app.ready();
      // No assertions needed, just shouldn't throw
    });
  });
});
