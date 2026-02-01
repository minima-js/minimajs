import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import type { Server } from "node:http";
import { createApp } from "../../node/index.js";
import { createRequest } from "../../mock/request.js";
import type { App } from "../../interfaces/index.js";
import { RedirectError, HttpError } from "../../error.js";
import { hook, abort } from "../../index.js";

describe("handleError", () => {
  let app: App<Server>;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app?.close());

  test("RedirectError bypasses hooks and renders directly", async () => {
    const hookCalled = { value: false };

    app.register(
      hook("error", () => {
        hookCalled.value = true;
        return { hooked: true };
      })
    );

    app.get("/redirect", () => {
      throw new RedirectError("/target");
    });

    const response = await app.handle(createRequest("/redirect"));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/target");
    expect(hookCalled.value).toBe(false);
  });

  test("error hook can intercept and return custom response", async () => {
    app.register(hook("error", (err) => ({ intercepted: true, originalStatus: (err as HttpError).status })));

    app.get("/error", () => {
      throw new HttpError("Original", 400);
    });

    const response = await app.handle(createRequest("/error"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ intercepted: true, originalStatus: 400 });
  });

  test("thrown error from hook is passed to next hook", async () => {
    const callOrder: string[] = [];

    app.register(
      hook("error", (err) => {
        callOrder.push("first");
        return { handled: true, error: (err as Error).message };
      })
    );

    app.register(
      hook("error", () => {
        callOrder.push("second");
        throw new Error("Second throws");
      })
    );

    app.get("/chain", () => {
      throw new Error("Original");
    });

    const response = await app.handle(createRequest("/chain"));
    expect(callOrder).toEqual(["second", "first"]);
    expect(await response.json()).toEqual({ handled: true, error: "Second throws" });
  });

  test("hook throwing HttpError falls through to BaseHttpError handling", async () => {
    app.register(
      hook("error", () => {
        throw new HttpError("Hook error", 400);
      })
    );

    app.get("/error", () => {
      throw new Error("Original");
    });

    const response = await app.handle(createRequest("/error"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Hook error" });
  });

  test("non-HTTP error falls through to generic 500 with decorated message", async () => {
    app.register(
      hook("error", (err) => {
        if (!Error.isError(err)) throw err;
        abort({ decorated: err.message }, 400);
      })
    );

    app.get("/error", () => {
      throw new Error("Original");
    });

    const response = await app.handle(createRequest("/error"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ decorated: "Original" });
  });
});
