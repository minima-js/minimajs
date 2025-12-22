import { jest } from "@jest/globals";
import { createApp, hook, defer, onError, plugin, type App, type HookCallback } from "./index.js";

describe("hooks", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false, routes: { log: false } });
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

      await app.inject({ url: "/" });
      expect(deferred).toHaveBeenCalled();
      expect(execution).toHaveBeenCalled();
      const firstCallIndex = (execution as jest.Mock).mock.invocationCallOrder[0];
      const secondCallIndex = (deferred as jest.Mock).mock.invocationCallOrder[0];
      expect(firstCallIndex).toBeLessThan(secondCallIndex!);
    });
  });

  describe("onError", () => {
    test("should call on error", async () => {
      const onErrorFn = jest.fn();
      app.get("/", () => {
        onError(onErrorFn);
        throw new Error("test");
      });
      await app.inject({ url: "/" });
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
      const closeHook = hook("close", (_i, done) => {
        closed = true;
        done();
      });

      app.register(closeHook);
      await app.ready();

      await app.close();
      expect(closed).toBe(true);
    });

    test("should handle errors with manual done(err)", async () => {
      const closeHook = hook("close", (_i, done) => {
        done(new Error("Close error"));
      });
      app.register(closeHook);
      await app.ready();
      await expect(app.close()).rejects.toThrow("Close error");
    });
  });
});
