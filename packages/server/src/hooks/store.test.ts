import { describe, test, expect } from "@jest/globals";
import { createHooksStore, getHooks, addHook } from "./store.js";
import type { App } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";

describe("hooks/store", () => {
  describe("createHooksStore", () => {
    test("should create a store with all hook sets", () => {
      const store = createHooksStore();

      // Server hooks
      expect(store.close).toBeInstanceOf(Set);
      expect(store.listen).toBeInstanceOf(Set);
      expect(store.ready).toBeInstanceOf(Set);
      expect(store.register).toBeInstanceOf(Set);

      // Lifecycle hooks
      expect(store.request).toBeInstanceOf(Set);
      expect(store.transform).toBeInstanceOf(Set);
      expect(store.send).toBeInstanceOf(Set);
      expect(store.error).toBeInstanceOf(Set);
      expect(store.errorSent).toBeInstanceOf(Set);
      expect(store.sent).toBeInstanceOf(Set);
      expect(store.timeout).toBeInstanceOf(Set);
    });

    test("should have a clone method that clones lifecycle hooks", () => {
      const store = createHooksStore();
      const callback = () => {};
      store.request.add(callback);
      store.close.add(callback);

      const cloned = store.clone();

      // Lifecycle hooks should be cloned (new Set)
      expect(cloned.request).not.toBe(store.request);
      expect(cloned.request.has(callback)).toBe(true);

      // Server hooks should be shared reference
      expect(cloned.close).toBe(store.close);
    });
  });

  describe("getHooks", () => {
    test("should return hooks from app container", () => {
      const mockHooks = createHooksStore();
      const container = new Map();
      container.set(kHooks, mockHooks);

      const app = { container } as unknown as App;

      const result = getHooks(app);
      expect(result).toBe(mockHooks);
    });

    test("should throw error when HookStore not found in container", () => {
      const container = new Map();
      const app = { container } as unknown as App;

      expect(() => getHooks(app)).toThrow("HookStore not found in container");
    });
  });

  describe("addHook", () => {
    test("should add hook callback to the specified hook set", () => {
      const mockHooks = createHooksStore();
      const container = new Map();
      container.set(kHooks, mockHooks);

      const app = { container } as unknown as App;
      const callback = () => {};

      addHook(app, "request", callback);

      expect(mockHooks.request.has(callback)).toBe(true);
    });

    test("should add multiple hooks to the same set", () => {
      const mockHooks = createHooksStore();
      const container = new Map();
      container.set(kHooks, mockHooks);

      const app = { container } as unknown as App;
      const callback1 = () => {};
      const callback2 = () => {};

      addHook(app, "error", callback1);
      addHook(app, "error", callback2);

      expect(mockHooks.error.has(callback1)).toBe(true);
      expect(mockHooks.error.has(callback2)).toBe(true);
      expect(mockHooks.error.size).toBe(2);
    });
  });
});
