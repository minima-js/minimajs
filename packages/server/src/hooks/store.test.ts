import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createHooksStore, runHooks } from "./store.js";
import { createApp } from "../node/index.js";
import type { Context } from "../interfaces/index.js";
import { kHooks } from "../symbols.js";

describe("hooks/store", () => {
  describe("createHooksStore", () => {
    test("should have a clone method that clones lifecycle hooks", () => {
      const store = createHooksStore();
      const callback = () => {};
      store.request.add(callback);
      store.close.add(callback);
      const cloned = store.clone();
      expect(cloned.request).not.toBe(store.request);
      expect(cloned.request.has(callback)).toBe(true);
      expect(cloned.close).toBe(store.close);
    });

    test("should handle nested cloning", () => {
      const store = createHooksStore();
      const [cb1, cb2, cb3] = [() => {}, () => {}, () => {}];
      store.request.add(cb1);
      const level1 = store.clone();
      level1.request.add(cb2);
      const level2 = level1.clone();
      level2.request.add(cb3);

      expect(store.request.size).toBe(1);
      expect(level1.request.size).toBe(2);
      expect(level2.request.size).toBe(3);
      expect(level1.close).toBe(store.close);
      expect(level2.close).toBe(store.close);
    });

    test("should maintain isolation between sibling clones", () => {
      const store = createHooksStore();
      const [cbA, cbB] = [() => {}, () => {}];
      const siblingA = store.clone();
      const siblingB = store.clone();
      siblingA.request.add(cbA);
      siblingB.request.add(cbB);

      expect(siblingA.request.has(cbA)).toBe(true);
      expect(siblingA.request.has(cbB)).toBe(false);
      expect(siblingB.request.has(cbB)).toBe(true);
      expect(siblingB.request.has(cbA)).toBe(false);
    });

    test("should initialize all hooks when no parent", () => {
      const store = createHooksStore();
      expect(store.register).toBeInstanceOf(Set);
      expect(store.listen).toBeInstanceOf(Set);
      expect(store.ready).toBeInstanceOf(Set);
      expect(store.close).toBeInstanceOf(Set);
      expect(store.request).toBeInstanceOf(Set);
      expect(store.transform).toBeInstanceOf(Set);
      expect(store.send).toBeInstanceOf(Set);
      expect(store.error).toBeInstanceOf(Set);
      expect(store.timeout).toBeInstanceOf(Set);
    });
  });

  describe("runHooks", () => {
    let app: any;

    beforeEach(() => {
      app = createApp({ logger: false });
    });

    afterEach(async () => {
      if (app) await app.close();
    });

    test("should run hooks in FIFO order for normal hooks", async () => {
      const order: number[] = [];
      app.container[kHooks].ready.add(() => order.push(1));
      app.container[kHooks].ready.add(() => order.push(2));
      app.container[kHooks].ready.add(() => order.push(3));

      await runHooks(app, "ready");
      expect(order).toEqual([1, 2, 3]);
    });

    test("should run hooks in LIFO order for reversed hooks", async () => {
      const order: number[] = [];
      const cb1 = () => order.push(1);
      const cb2 = () => order.push(2);
      const cb3 = () => order.push(3);

      // Use transform hook which is reversed and doesn't interfere with minimajs
      app.container[kHooks].transform.clear();
      app.container[kHooks].transform.add(cb1);
      app.container[kHooks].transform.add(cb2);
      app.container[kHooks].transform.add(cb3);

      await runHooks.transform(app, "test", {} as Context);
      // LIFO: last added runs first (reversed order)
      expect(order).toEqual([3, 2, 1]);
    });

    test("runHooks.safe should catch errors", async () => {
      const order: number[] = [];
      app.container[kHooks].ready.add(() => {
        order.push(1);
        throw new Error("test");
      });
      app.container[kHooks].ready.add(() => order.push(2));

      await runHooks.safe(app, "ready");
      expect(order).toEqual([1, 2]);
    });

    test("runHooks.request should return Response if hook returns one", async () => {
      const response = new Response("test");
      app.container[kHooks].request.add(() => response);
      app.container[kHooks].request.add(() => {});

      const result = await runHooks.request(app, {} as Context);
      expect(result).toBe(response);
    });

    test("runHooks.request should return undefined if no hook returns Response", async () => {
      app.container[kHooks].request.add(() => {});
      app.container[kHooks].request.add(() => {});

      const result = await runHooks.request(app, {} as Context);
      expect(result).toBeUndefined();
    });

    test("runHooks.transform should chain transformations in LIFO order", async () => {
      app.container[kHooks].transform.add((data: number) => data * 2);
      app.container[kHooks].transform.add((data: number) => data + 1);

      const result = await runHooks.transform(app, 5, {} as Context);
      // LIFO: last added runs first, so: 5 -> 5+1=6 -> 6*2=12
      expect(result).toBe(12);
    });

    test("runHooks.error should return response if hook returns one", async () => {
      const response = new Response("error");
      app.container[kHooks].error.add(() => response);
      app.container[kHooks].error.add(() => {});

      const result = await runHooks.error(app, new Error("test"), {} as Context);
      expect(result).toBe(response);
    });

    test("runHooks.error should throw if no hook handles error", async () => {
      const error = new Error("test");
      app.container[kHooks].error.add(() => {});

      await expect(runHooks.error(app, error, {} as Context)).rejects.toBe(error);
    });

    test("runHooks.error should use new error if hook throws", async () => {
      const originalError = new Error("original");
      const newError = new Error("new");
      app.container[kHooks].error.add(() => {
        throw newError;
      });
      app.container[kHooks].error.add(() => {});

      await expect(runHooks.error(app, originalError, {} as Context)).rejects.toBe(newError);
    });
  });
});
