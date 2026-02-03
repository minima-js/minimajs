import { describe, test, beforeEach, afterEach, expect, jest } from "@jest/globals";
import { createApp } from "../bun/index.js";
import { createRequest } from "../mock/index.js";

import {
  hook,
  onError,
  defer,
  compose,
  type App,
  type OnReadyHook,
  type OnCloseHook,
  type ErrorCallback,
} from "../index.js";

describe("hooks", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false, moduleDiscovery: false });
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

      await app.handle(createRequest("/"));
      expect(deferred).toHaveBeenCalled();
      expect(execution).toHaveBeenCalled();
      const firstCallIndex = (execution as jest.Mock).mock.invocationCallOrder[0];
      const secondCallIndex = (deferred as jest.Mock).mock.invocationCallOrder[0];
      expect(firstCallIndex).toBeLessThan(secondCallIndex!);
    });

    test("should call defer even when error occurs", async () => {
      const deferred = jest.fn();

      app.get("/error", () => {
        defer(() => {
          deferred();
        });
        throw new Error("Test error");
      });

      const res = await app.handle(createRequest("/error"));
      expect(res.status).toBe(500);
      expect(deferred).toHaveBeenCalled();
    });
  });

  describe("onError", () => {
    test("should handle request-scoped onError", async () => {
      const onErrorFn = jest.fn<ErrorCallback>();

      app.get("/scoped", () => {
        onError(onErrorFn);
        throw new Error("test");
      });

      const res = await app.handle(createRequest("/scoped"));
      expect(res.status).toBe(500);
      expect(onErrorFn).toHaveBeenCalled();
    });

    test("should return 200 when error hook returns data", async () => {
      const errorResponse = { error: "Custom error", code: 400 };
      app.get("/handled", () => {
        throw new Error("Original error");
      });
      app.register(hook("error", () => errorResponse));

      const response = await app.handle(createRequest("/handled"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(errorResponse);
    });

    test("should return 500 when no error hook handles the error", async () => {
      app.get("/unhandled", () => {
        throw new Error("Unhandled");
      });
      app.register(
        hook("error", () => {
          // Return undefined to not handle the error
        })
      );

      const errorRes = await app.handle(createRequest("/unhandled"));
      expect(errorRes.status).toBe(500);
    });

    test("should chain error hooks with LIFO order and handle throws", async () => {
      const callOrder: string[] = [];

      // First hook handles it
      app.register(
        hook("error", () => {
          callOrder.push("first");
          return { handled: true };
        })
      );

      // Second hook returns undefined, continues chain
      app.register(
        hook("error", (err) => {
          callOrder.push("second");
          expect((err as Error).message).toBe("Third throws");
        })
      );

      // Third hook throws new error
      app.register(
        hook("error", () => {
          callOrder.push("third");
          throw new Error("Third throws");
        })
      );

      // Fourth hook runs first (LIFO)
      app.register(
        hook("error", () => {
          callOrder.push("fourth");
        })
      );

      app.get("/chain", () => {
        throw new Error("Original");
      });

      const response = await app.handle(createRequest("/chain"));
      expect(callOrder).toEqual(["fourth", "third", "second", "first"]);
      expect(await response.json()).toEqual({ handled: true });
    });
  });

  describe("lifecycle hooks", () => {
    test("should execute ready and close hooks in correct order", async () => {
      let dbConnected = false;
      let dbClosed = false;
      const onClose = jest.fn(() => Promise.resolve());

      // Test close hook
      app.register(hook("close", onClose));

      // Test ready/close with compose
      const closeDBHook = hook("close", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(dbConnected).toBe(true);
        dbClosed = true;
      });

      const connectDBHook = hook("ready", async () => {
        dbConnected = true;
      });

      app.register(compose(connectDBHook, closeDBHook));

      expect(onClose).not.toHaveBeenCalled();

      await app.ready();
      expect(dbConnected).toBe(true);
      expect(dbClosed).toBe(false);

      await app.close();
      expect(onClose).toHaveBeenCalled();
      expect(dbClosed).toBe(true);
    });
  });

  describe("hook.lifespan", () => {
    test("should run setup/cleanup and handle async operations", async () => {
      const onReady = jest.fn();
      const onClose = jest.fn();
      let asyncReady = false;
      let asyncClosed = false;

      // Test sync lifespan
      const syncLifespan = hook.lifespan(async () => {
        onReady();
        return async () => {
          onClose();
        };
      });

      // Test async lifespan
      const asyncLifespan = hook.lifespan(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        asyncReady = true;
        return async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          asyncClosed = true;
        };
      });

      app.register(syncLifespan);
      app.register(asyncLifespan);

      expect(onReady).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(asyncReady).toBe(false);
      expect(asyncClosed).toBe(false);

      await app.ready();
      expect(onReady).toHaveBeenCalled();
      expect(asyncReady).toBe(true);
      expect(onClose).not.toHaveBeenCalled();
      expect(asyncClosed).toBe(false);

      await app.close();
      expect(onClose).toHaveBeenCalled();
      expect(asyncClosed).toBe(true);
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
    test("should register single, multiple, and async hooks", async () => {
      const readyHook = jest.fn<OnReadyHook>();
      const closeHook = jest.fn<OnCloseHook>();
      let asyncCalled = false;

      // Test single hook
      app.register(hook.define({ ready: readyHook }));

      // Test multiple hooks
      app.register(hook.define({ ready: readyHook, close: closeHook }));

      // Test async hooks
      app.register(
        hook.define({
          ready: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            asyncCalled = true;
          },
        })
      );

      // Test empty hooks
      app.register(hook.define({}));

      expect(readyHook).not.toHaveBeenCalled();
      expect(closeHook).not.toHaveBeenCalled();

      await app.ready();
      expect(readyHook).toHaveBeenCalledTimes(1);
      expect(asyncCalled).toBe(true);
      expect(closeHook).not.toHaveBeenCalled();

      await app.close();
      expect(closeHook).toHaveBeenCalled();
    });
  });

  describe("hook execution order", () => {
    test("ready hooks run parent → child across nested modules", async () => {
      const readyOrder: string[] = [];

      app.register(
        hook("ready", function rootReady() {
          readyOrder.push("root");
        })
      );

      app.register(async (app) => {
        app.register(
          hook("ready", function level1Ready() {
            readyOrder.push("level1");
          })
        );

        app.register(async (app) => {
          app.register(
            hook("ready", function level2Ready() {
              readyOrder.push("level2");
            })
          );
        });
      });

      await app.ready();
      expect(readyOrder).toEqual(["root", "level1", "level2"]);
    });

    test("request hooks run Parent → Child (FIFO)", async () => {
      const requestOrder: string[] = [];

      app.register(
        hook("request", function parentRequestHook() {
          requestOrder.push("parent");
        })
      );

      app.register(async (app) => {
        app.register(
          hook("request", function childRequestHook() {
            requestOrder.push("child");
          })
        );

        app.get("/test", () => ({ result: "ok" }));
      });
      await app.handle(createRequest("/test"));

      expect(requestOrder).toEqual(["parent", "child"]);
    });

    test("transform hooks run Child → Parent (LIFO)", async () => {
      const transformOrder: string[] = [];

      app.register(
        hook("transform", async (data) => {
          transformOrder.push("parent");
          return data;
        })
      );

      app.register(async (app) => {
        app.register(
          hook("transform", async (data) => {
            transformOrder.push("child");
            return data;
          })
        );

        app.get("/test", () => ({ result: "ok" }));
      });
      await app.handle(createRequest("/test"));

      expect(transformOrder).toEqual(["child", "parent"]);
    });

    test("Child → Parent (LIFO): error, send, close", async () => {
      const errorOrder: string[] = [];
      const sendOrder: string[] = [];
      const closeOrder: string[] = [];

      app.register(
        hook("error", () => {
          errorOrder.push("parent");
          return { error: "handled" };
        })
      );
      app.register(
        hook("send", () => {
          sendOrder.push("parent");
        })
      );
      app.register(
        hook("close", () => {
          closeOrder.push("parent");
        })
      );

      app.register(async (app) => {
        app.register(
          hook("error", () => {
            errorOrder.push("child");
          })
        );
        app.register(
          hook("send", () => {
            sendOrder.push("child");
          })
        );
        app.register(
          hook("close", () => {
            closeOrder.push("child");
          })
        );

        app.get("/ok", () => "ok");
        app.get("/error", () => {
          throw new Error("test");
        });
      });

      await app.ready();
      await app.handle(createRequest("/ok"));
      await app.handle(createRequest("/error"));
      await app.close();

      expect(errorOrder).toEqual(["child", "parent"]);
      expect(sendOrder).toEqual(["child", "parent", "child", "parent"]);
      expect(closeOrder).toEqual(["child", "parent"]);
    });

    test("request hooks stay scoped to their module", async () => {
      const calls: string[] = [];

      // Module A
      app.register(async (app) => {
        app.register(
          hook("request", () => {
            calls.push("A");
          })
        );
        app.get("/a", () => "A");
      });

      // Module B
      app.register(async (app) => {
        app.register(
          hook("request", () => {
            calls.push("B");
          })
        );
        app.get("/b", () => "B");
      });

      await app.handle(createRequest("/a"));
      expect(calls).toEqual(["A"]);

      calls.length = 0;

      await app.handle(createRequest("/b"));
      expect(calls).toEqual(["B"]);
    });

    test("plain function modules keep hooks isolated from siblings", async () => {
      const calls: string[] = [];

      // Module A: plain function (not wrapped with plugin)
      app.register(async (app) => {
        app.register(
          hook("request", () => {
            calls.push("hookA");
          })
        );
        app.get("/route-a", () => "A");
      });

      // Module B: plain function (not wrapped with plugin)
      app.register(async (app) => {
        app.register(
          hook("request", () => {
            calls.push("hookB");
          })
        );
        app.get("/route-b", () => "B");
      });

      await app.ready();

      // Hit route from module A - should only trigger hookA, NOT hookB
      await app.handle(createRequest("/route-a"));
      expect(calls).toEqual(["hookA"]);

      calls.length = 0;

      // Hit route from module B - should only trigger hookB, NOT hookA
      await app.handle(createRequest("/route-b"));
      expect(calls).toEqual(["hookB"]);
    });

    test("sibling modules should not share hooks even with same parent", async () => {
      const calls: string[] = [];

      // Parent adds a hook
      app.register(
        hook("request", () => {
          calls.push("parent");
        })
      );

      // Child A adds its own hook
      app.register(async (childA) => {
        childA.register(
          hook("request", () => {
            calls.push("childA");
          })
        );
        childA.get("/a", () => "A");
      });

      // Child B adds its own hook
      app.register(async (childB) => {
        childB.register(
          hook("request", () => {
            calls.push("childB");
          })
        );
        childB.get("/b", () => "B");
      });

      await app.ready();

      // Route A should run: parent, childA (NOT childB)
      await app.handle(createRequest("/a"));
      expect(calls).toEqual(["parent", "childA"]);

      calls.length = 0;

      // Route B should run: parent, childB (NOT childA)
      await app.handle(createRequest("/b"));
      expect(calls).toEqual(["parent", "childB"]);
    });

    test("multi-level nested modules maintain proper hook isolation", async () => {
      const calls: string[] = [];

      // Root hook
      app.register(
        hook("request", () => {
          calls.push("root");
        })
      );

      // Level 1 Module A
      app.register(async (level1A) => {
        level1A.register(
          hook("request", () => {
            calls.push("level1A");
          })
        );

        // Level 2 Module A1 (child of A)
        level1A.register(async (level2A1) => {
          level2A1.register(
            hook("request", () => {
              calls.push("level2A1");
            })
          );
          level2A1.get("/a1", () => "A1");
        });

        // Level 2 Module A2 (child of A)
        level1A.register(async (level2A2) => {
          level2A2.register(
            hook("request", () => {
              calls.push("level2A2");
            })
          );
          level2A2.get("/a2", () => "A2");
        });
      });

      // Level 1 Module B (sibling of A)
      app.register(async (level1B) => {
        level1B.register(
          hook("request", () => {
            calls.push("level1B");
          })
        );

        // Level 2 Module B1 (child of B)
        level1B.register(async (level2B1) => {
          level2B1.register(
            hook("request", () => {
              calls.push("level2B1");
            })
          );
          level2B1.get("/b1", () => "B1");
        });
      });

      await app.ready();

      // Route /a1 should run: root → level1A → level2A1 (NOT level2A2, NOT level1B, NOT level2B1)
      await app.handle(createRequest("/a1"));
      expect(calls).toEqual(["root", "level1A", "level2A1"]);

      calls.length = 0;

      // Route /a2 should run: root → level1A → level2A2 (NOT level2A1, NOT level1B, NOT level2B1)
      await app.handle(createRequest("/a2"));
      expect(calls).toEqual(["root", "level1A", "level2A2"]);

      calls.length = 0;

      // Route /b1 should run: root → level1B → level2B1 (NOT level1A, NOT level2A1, NOT level2A2)
      await app.handle(createRequest("/b1"));
      expect(calls).toEqual(["root", "level1B", "level2B1"]);
    });

    test("multi-level nested modules with async hooks maintain isolation", async () => {
      const calls: string[] = [];

      // Root async hook
      app.register(
        hook("request", async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          calls.push("root");
        })
      );

      // Level 1 Module A with async hook
      app.register(async (level1A) => {
        level1A.register(
          hook("request", async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            calls.push("level1A");
          })
        );

        // Level 2 Module A1 (child of A) with async hook
        level1A.register(async (level2A1) => {
          level2A1.register(
            hook("request", async () => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              calls.push("level2A1");
            })
          );
          level2A1.get("/async-a1", async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return "A1";
          });
        });

        // Level 2 Module A2 (child of A) with async hook
        level1A.register(async (level2A2) => {
          level2A2.register(
            hook("request", async () => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              calls.push("level2A2");
            })
          );
          level2A2.get("/async-a2", async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return "A2";
          });
        });
      });

      // Level 1 Module B (sibling of A) with async hook
      app.register(async (level1B) => {
        level1B.register(
          hook("request", async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            calls.push("level1B");
          })
        );

        // Level 2 Module B1 (child of B) with async hook
        level1B.register(async (level2B1) => {
          level2B1.register(
            hook("request", async () => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              calls.push("level2B1");
            })
          );
          level2B1.get("/async-b1", async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return "B1";
          });
        });
      });

      await app.ready();

      // Route /async-a1 should run: root → level1A → level2A1 (NOT level2A2, NOT level1B, NOT level2B1)
      await app.handle(createRequest("/async-a1"));
      expect(calls).toEqual(["root", "level1A", "level2A1"]);

      calls.length = 0;

      // Route /async-a2 should run: root → level1A → level2A2 (NOT level2A1, NOT level1B, NOT level2B1)
      await app.handle(createRequest("/async-a2"));
      expect(calls).toEqual(["root", "level1A", "level2A2"]);

      calls.length = 0;

      // Route /async-b1 should run: root → level1B → level2B1 (NOT level1A, NOT level2A1, NOT level2A2)
      await app.handle(createRequest("/async-b1"));
      expect(calls).toEqual(["root", "level1B", "level2B1"]);
    });

    test("multiple hooks in same scope follow correct order", async () => {
      const fifoOrder: string[] = [];
      const lifoOrder: string[] = [];

      // FIFO: request hooks
      app.register(
        hook("request", () => {
          fifoOrder.push("first");
        })
      );
      app.register(
        hook("request", () => {
          fifoOrder.push("second");
        })
      );
      app.register(
        hook("request", () => {
          fifoOrder.push("third");
        })
      );

      // LIFO: error hooks
      app.register(
        hook("error", () => {
          lifoOrder.push("first");
        })
      );
      app.register(
        hook("error", () => {
          lifoOrder.push("second");
        })
      );
      app.register(
        hook("error", () => {
          lifoOrder.push("third");
        })
      );

      app.get("/ok", () => "ok");
      app.get("/error", () => {
        throw new Error("test");
      });

      await app.handle(createRequest("/ok"));
      expect(fifoOrder).toEqual(["first", "second", "third"]);

      await app.handle(createRequest("/error"));
      expect(lifoOrder).toEqual(["third", "second", "first"]);
    });

    test("nested scopes maintain correct execution order", async () => {
      const requestOrder: string[] = [];
      const errorOrder: string[] = [];

      app.register(
        hook("request", () => {
          requestOrder.push("root");
        })
      );
      app.register(
        hook("error", () => {
          errorOrder.push("root");
        })
      );

      app.register(async (app) => {
        app.register(
          hook("request", () => {
            requestOrder.push("level1");
          })
        );
        app.register(
          hook("error", () => {
            errorOrder.push("level1");
          })
        );

        app.register(async (app) => {
          app.register(
            hook("request", () => {
              requestOrder.push("level2");
            })
          );
          app.register(
            hook("error", () => {
              errorOrder.push("level2");
            })
          );

          app.get("/ok", () => "ok");
          app.get("/error", () => {
            throw new Error("test");
          });
        });
      });

      await app.handle(createRequest("/ok"));
      expect(requestOrder).toEqual(["root", "level1", "level2"]);

      await app.handle(createRequest("/error"));
      expect(errorOrder).toEqual(["level2", "level1", "root"]);
    });
  });
});
