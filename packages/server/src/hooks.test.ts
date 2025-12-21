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
      const onClose = jest.fn(() => {});
      app.register(hook("close", onClose));
      expect(onClose).not.toHaveBeenCalled();
      await app.close();
      expect(onClose).toHaveBeenCalled();
    });

    test("it should call composed hooks", async () => {
      const prevHook = jest.fn<HookCallback>();
      const onClose = jest.fn(() => {});
      await app.register(plugin.compose(hook("close", onClose), hook("close", prevHook))).close();
      expect(onClose).toHaveBeenCalled();
      expect(prevHook).toHaveBeenCalled();
    });

    test("should support hook composition with different lifecycle events", async () => {
      const closeDB = jest.fn<HookCallback>();
      const connectDB = jest.fn<HookCallback>();

      const closeDBHook = hook("close", closeDB);
      const connectDBHook = hook("ready", connectDB);

      app.register(plugin.compose(connectDBHook, closeDBHook));

      await app.ready();
      expect(connectDB).toHaveBeenCalled();

      await app.close();
      expect(closeDB).toHaveBeenCalled();
    });

    test("should call composed hooks when registered with plugin.compose", async () => {
      const closeDB = jest.fn<HookCallback>();
      const connectDB = jest.fn<HookCallback>();

      const closeDBHook = hook("close", closeDB);
      const connectDBHook = hook("ready", connectDB);

      // Use plugin.compose to register both hooks
      app.register(plugin.compose(connectDBHook, closeDBHook));

      await app.ready();
      await app.close();

      expect(connectDB).toHaveBeenCalled();
      expect(closeDB).toHaveBeenCalled();
    });

    test("should support multiple hooks with plugin.compose", async () => {
      const hook1 = jest.fn<HookCallback>();
      const hook2 = jest.fn<HookCallback>();
      const mainHook = jest.fn<HookCallback>();

      const h1 = hook("close", hook1);
      const h2 = hook("close", hook2);
      const main = hook("ready", mainHook);

      app.register(plugin.compose(main, h1, h2));

      await app.ready();
      await app.close();

      expect(mainHook).toHaveBeenCalled();
      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
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
});
