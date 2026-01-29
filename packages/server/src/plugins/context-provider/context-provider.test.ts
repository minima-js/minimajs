import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import type { Server } from "node:http";
import { createApp } from "../../node/index.js";
import { createRequest } from "../../mock/request.js";
import type { App, Middleware } from "../../interfaces/index.js";
import { contextProvider } from "./index.js";
import { kMiddlewares } from "../../symbols.js";
import { executionContext } from "../../index.js";

describe("contextProvider", () => {
  let app: App<Server>;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app?.close());

  test("should override the default context provider", async () => {
    const executionLog: string[] = [];

    // Get the initial middleware count (includes default context provider from core/index.ts)
    const initialMiddlewareCount = app.container[kMiddlewares].size;

    // Register a custom context provider - this should replace the default one
    const customContextProvider: Middleware = async (ctx, next) => {
      executionLog.push("custom-provider-start");
      (ctx as any).customValue = "injected-by-custom-provider";
      return executionContext.run(ctx, async () => {
        const response = await next();
        executionLog.push("custom-provider-end");
        return response;
      });
    };

    app.register(contextProvider(customContextProvider));

    // Middleware count should remain the same (replacement, not addition)
    expect(app.container[kMiddlewares].size).toBe(initialMiddlewareCount);

    app.get("/test", (ctx) => {
      executionLog.push("handler");
      return { customValue: (ctx as any).customValue };
    });

    const response = await app.handle(createRequest("/test"));
    const data = await response.json();

    // Verify the custom provider was executed
    expect(data).toEqual({ customValue: "injected-by-custom-provider" });
    expect(executionLog).toEqual(["custom-provider-start", "handler", "custom-provider-end"]);
  });
});
