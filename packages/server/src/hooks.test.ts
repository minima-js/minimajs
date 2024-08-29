import { jest } from "@jest/globals";
import { createApp, createHook, defer } from "./index.js";

describe("hooks", () => {
  describe("defer", () => {
    test("should call after response send", async () => {
      const deferred = jest.fn();
      const execution = jest.fn();
      const app = createApp({ routes: { log: false } });
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

  describe("createHook", () => {
    test("it should call closed hook after app is closed", async () => {
      const onClose = jest.fn(() => {});
      const app = createApp({ routes: { log: false } });
      app.register(createHook("close", onClose));
      expect(onClose).not.toHaveBeenCalled();
      await app.close();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
