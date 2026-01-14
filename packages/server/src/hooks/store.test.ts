import { describe, test, expect } from "@jest/globals";
import { createHooksStore, getHooks, addHook } from "./store.js";
import type { App, Container } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";

describe("hooks/store", () => {
  describe("createHooksStore", () => {
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

    test("should handle nested cloning (clone().clone())", () => {
      const store = createHooksStore();
      const callback1 = () => {};
      const callback2 = () => {};
      const callback3 = () => {};

      // Add hooks to root
      store.request.add(callback1);
      store.close.add(callback1);

      // First level clone
      const level1 = store.clone();
      level1.request.add(callback2);
      level1.close.add(callback2);

      // Second level clone
      const level2 = level1.clone();
      level2.request.add(callback3);
      level2.close.add(callback3);

      // Lifecycle hooks should be independent at each level
      expect(store.request.size).toBe(1);
      expect(store.request.has(callback1)).toBe(true);
      expect(store.request.has(callback2)).toBe(false);
      expect(store.request.has(callback3)).toBe(false);

      expect(level1.request.size).toBe(2);
      expect(level1.request.has(callback1)).toBe(true);
      expect(level1.request.has(callback2)).toBe(true);
      expect(level1.request.has(callback3)).toBe(false);

      expect(level2.request.size).toBe(3);
      expect(level2.request.has(callback1)).toBe(true);
      expect(level2.request.has(callback2)).toBe(true);
      expect(level2.request.has(callback3)).toBe(true);

      // Server hooks should all share the same reference
      expect(level1.close).toBe(store.close);
      expect(level2.close).toBe(store.close);
      expect(level2.close.size).toBe(3); // All callbacks added to same Set
    });

    test("should maintain isolation between sibling clones", () => {
      const store = createHooksStore();
      const callbackA = () => {};
      const callbackB = () => {};

      // Add hook to root
      store.request.add(() => {});

      // Create two sibling clones
      const siblingA = store.clone();
      const siblingB = store.clone();

      // Add different hooks to each sibling
      siblingA.request.add(callbackA);
      siblingB.request.add(callbackB);

      // Sibling A should not have sibling B's hook
      expect(siblingA.request.has(callbackA)).toBe(true);
      expect(siblingA.request.has(callbackB)).toBe(false);

      // Sibling B should not have sibling A's hook
      expect(siblingB.request.has(callbackB)).toBe(true);
      expect(siblingB.request.has(callbackA)).toBe(false);

      // Both should have the root hook
      expect(siblingA.request.size).toBe(2); // root + callbackA
      expect(siblingB.request.size).toBe(2); // root + callbackB
    });
  });

  describe("getHooks", () => {
    test("should return hooks from app container", () => {
      const mockHooks = createHooksStore();
      const container: Container = { [kHooks]: mockHooks } as any;

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
      const container: Container = { [kHooks]: mockHooks } as any;

      const app = { container } as unknown as App;
      const callback = () => {};

      addHook(app, "request", callback);

      expect(mockHooks.request.has(callback)).toBe(true);
    });

    test("should add multiple hooks to the same set", () => {
      const mockHooks = createHooksStore();
      const container: Container = { [kHooks]: mockHooks } as any;

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
