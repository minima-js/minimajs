/**
 * Integration tests for request abortion (AbortSignal)
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "../../node/index.js";
import { context } from "../../context.js";
import type { Server } from "../../core/index.js";

describe("Request Abortion Integration Tests", () => {
  let app: Server;
  let serverUrl: string;

  beforeEach(async () => {
    app = createApp();
    const { address } = await app.listen({ port: 0 }); // Random port
    serverUrl = address;
  });

  afterEach(async () => {
    await app.close();
  });

  test("should provide AbortSignal in context", async () => {
    let signalInHandler: AbortSignal | null = null;

    app.get("/test", () => {
      const ctx = context();
      signalInHandler = ctx.request.signal;
      return { success: true };
    });

    const response = await fetch(`${serverUrl}/test`);
    expect(response.status).toBe(200);
    expect(signalInHandler).toBeDefined();
    expect(signalInHandler).toBeInstanceOf(AbortSignal);
  });

  test("should have non-aborted signal for completed requests", async () => {
    let wasAborted = false;

    app.get("/test", () => {
      const ctx = context();
      wasAborted = ctx.request.signal.aborted;
      return { aborted: wasAborted };
    });

    const response = await fetch(`${serverUrl}/test`);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(wasAborted).toBe(false);
    expect(data.aborted).toBe(false);
  });

  test("should abort signal when client aborts request", async () => {
    let abortEventFired = false;

    app.get("/slow", async () => {
      const ctx = context();

      ctx.request.signal.addEventListener("abort", () => {
        abortEventFired = true;
      });

      // Simulate slow operation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return { completed: true };
    });

    const controller = new AbortController();

    // Start request
    const fetchPromise = fetch(`${serverUrl}slow`, {
      signal: controller.signal,
    });

    // Abort after 100ms
    setTimeout(() => controller.abort(), 100);

    try {
      await fetchPromise;
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe("AbortError");
    }

    // Give some time for the abort event to fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(abortEventFired).toBe(true);
  });

  test("should detect client disconnect during long operation", async () => {
    let disconnectDetected = false;

    app.get("/long-task", async () => {
      const ctx = context();

      const abortHandler = () => {
        disconnectDetected = true;
      };

      ctx.request.signal.addEventListener("abort", abortHandler);

      // Simulate long operation with periodic checks
      for (let i = 0; i < 50; i++) {
        if (ctx.request.signal.aborted) {
          return { error: "Request aborted", disconnectDetected };
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { completed: true };
    });

    const controller = new AbortController();

    const fetchPromise = fetch(`${serverUrl}long-task`, {
      signal: controller.signal,
    });

    // Abort after 200ms
    setTimeout(() => controller.abort(), 200);

    try {
      await fetchPromise;
    } catch (error: any) {
      expect(error.name).toBe("AbortError");
    }

    // Wait for abort handler to fire
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(disconnectDetected).toBe(true);
  });

  test("should allow cleanup on abort", async () => {
    let cleanupCalled = false;
    let resourcesReleased = false;

    app.get("/cleanup-test", async () => {
      const ctx = context();

      const cleanup = () => {
        cleanupCalled = true;
        resourcesReleased = true;
      };

      ctx.request.signal.addEventListener("abort", cleanup);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { success: true };
    });

    const controller = new AbortController();

    const fetchPromise = fetch(`${serverUrl}cleanup-test`, {
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 100);

    try {
      await fetchPromise;
    } catch (error: any) {
      expect(error.name).toBe("AbortError");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(cleanupCalled).toBe(true);
    expect(resourcesReleased).toBe(true);
  });

  test("should pass signal to nested fetch calls", async () => {
    let nestedFetchAborted = false;

    app.get("/proxy", async () => {
      const ctx = context();

      try {
        // This would normally call an external API
        // For testing, we'll just check if we can pass the signal
        await new Promise((resolve, reject) => {
          if (ctx.request.signal.aborted) {
            nestedFetchAborted = true;
            reject(new Error("Aborted"));
          }

          const timeout = setTimeout(resolve, 2000);

          ctx.request.signal.addEventListener("abort", () => {
            clearTimeout(timeout);
            nestedFetchAborted = true;
            reject(new Error("Aborted"));
          });
        });

        return { success: true };
      } catch (error) {
        return { error: "Request aborted" };
      }
    });

    const controller = new AbortController();

    const fetchPromise = fetch(`${serverUrl}proxy`, {
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 100);

    try {
      await fetchPromise;
    } catch (error: any) {
      expect(error.name).toBe("AbortError");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(nestedFetchAborted).toBe(true);
  });

  test("should handle multiple abort listeners", async () => {
    let listener1Called = false;
    let listener2Called = false;
    let listener3Called = false;

    app.get("/multi-listener", async () => {
      const ctx = context();

      ctx.request.signal.addEventListener("abort", () => {
        listener1Called = true;
      });

      ctx.request.signal.addEventListener("abort", () => {
        listener2Called = true;
      });

      ctx.request.signal.addEventListener("abort", () => {
        listener3Called = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { success: true };
    });

    const controller = new AbortController();

    const fetchPromise = fetch(`${serverUrl}multi-listener`, {
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 100);

    try {
      await fetchPromise;
    } catch (error: any) {
      expect(error.name).toBe("AbortError");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
    expect(listener3Called).toBe(true);
  });

  test("should not abort signal for successfully completed requests", async () => {
    let signalAbortedDuringRequest = false;
    let signalAbortedAfterRequest = false;
    let abortEventFired = false;

    app.get("/quick", async () => {
      const ctx = context();

      ctx.request.signal.addEventListener("abort", () => {
        abortEventFired = true;
      });

      signalAbortedDuringRequest = ctx.request.signal.aborted;

      // Quick operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      signalAbortedAfterRequest = ctx.request.signal.aborted;

      return {
        abortedDuring: signalAbortedDuringRequest,
        abortedAfter: signalAbortedAfterRequest,
      };
    });

    const response = await fetch(`${serverUrl}quick`);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(signalAbortedDuringRequest).toBe(false);
    expect(signalAbortedAfterRequest).toBe(false);
    expect(abortEventFired).toBe(false);
    expect(data.abortedDuring).toBe(false);
    expect(data.abortedAfter).toBe(false);
  });
});
