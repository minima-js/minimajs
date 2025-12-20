import { jest } from "@jest/globals";
import { createApp, createHook, defer, onError, type App, type HookCallback } from "./index.js";

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

  describe("createHook", () => {
    test("it should call closed hook after app is closed", async () => {
      const onClose = jest.fn(() => {});
      app.register(createHook("close", onClose));
      expect(onClose).not.toHaveBeenCalled();
      await app.close();
      expect(onClose).toHaveBeenCalled();
    });

    test("it should call previous hooks", async () => {
      const prevHook = jest.fn<HookCallback>();
      const onClose = jest.fn(() => {});
      await app.register(createHook("close", onClose, createHook("close", prevHook))).close();
      expect(onClose).toHaveBeenCalled();
      expect(prevHook).toHaveBeenCalled();
    });
  });
});
