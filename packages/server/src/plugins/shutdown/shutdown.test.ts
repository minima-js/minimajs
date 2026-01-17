import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { shutdown, type QuitHandler } from "./index.js";
import { shutdownListener } from "./listener.js";
import type { Signals } from "../../interfaces/index.js";
import { createApp } from "../../bun/index.js";

describe("shutdownListener", () => {
  let quitHandler: QuitHandler;
  let mockProcess: NodeJS.Process;
  const killSignal: Signals[] = ["SIGINT", "SIGTERM"];
  const timeout = 5000;

  beforeEach(() => {
    jest.useFakeTimers();
    quitHandler = jest.fn(() => Promise.resolve());
    mockProcess = {
      on: jest.fn(),
      off: jest.fn(),
      kill: jest.fn(),
      exit: jest.fn(),
      listeners: jest.fn().mockReturnValue([]),
      pid: 1234,
    } as unknown as NodeJS.Process;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test("should set up listeners for each kill signal", () => {
    shutdownListener(quitHandler, killSignal, timeout, mockProcess);
    expect(mockProcess.on).toHaveBeenCalledTimes(killSignal.length);
    killSignal.forEach((signal) => {
      expect(mockProcess.on).toHaveBeenCalledWith(signal, expect.any(Function));
    });
  });

  test("should call quitHandler and remove listener when signal is received", async () => {
    shutdownListener(quitHandler, killSignal, timeout, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(quitHandler).toHaveBeenCalled();
    expect(mockProcess.off).toHaveBeenCalledWith("SIGINT", quit);
  });

  test("should kill the process after quitHandler is called", async () => {
    shutdownListener(quitHandler, killSignal, timeout, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockProcess.kill).toHaveBeenCalledWith(mockProcess.pid, "SIGINT");
  });

  test("should not kill the process if listeners still exist", async () => {
    (mockProcess.listeners as any).mockReturnValue([jest.fn()]);
    shutdownListener(quitHandler, killSignal, timeout, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockProcess.kill).not.toHaveBeenCalled();
  });

  test("should prevent duplicate shutdown attempts", async () => {
    shutdownListener(quitHandler, killSignal, timeout, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1];

    // Start first shutdown
    const firstShutdown = quit("SIGINT");
    // Attempt second shutdown while first is in progress
    await quit("SIGTERM");

    expect(quitHandler).toHaveBeenCalledTimes(1); // Only called once

    // Complete first shutdown
    await firstShutdown;
  });

  test("should force exit after timeout if shutdown hangs", async () => {
    const hangingQuitHandler = jest.fn(() => new Promise<void>(() => {})); // Never resolves
    shutdownListener(hangingQuitHandler, killSignal, timeout, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1];

    // Start shutdown (don't await since it never resolves)
    quit("SIGINT");

    // Fast-forward time past timeout
    jest.advanceTimersByTime(timeout);
    await Promise.resolve(); // Allow any pending promises to resolve

    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });

  test("should clear timeout if shutdown completes successfully", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    shutdownListener(quitHandler, killSignal, timeout, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1];

    await quit("SIGINT");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(mockProcess.exit).not.toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});

describe("shutdown plugin", () => {
  test("should create shutdown plugin with default options", () => {
    const app = createApp({ logger: false });
    const plugin = shutdown();

    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe("function");

    app.close();
  });

  test("should create shutdown plugin with custom signals", () => {
    const app = createApp({ logger: false });
    const plugin = shutdown({ signals: ["SIGINT"] });

    expect(plugin).toBeDefined();

    app.close();
  });

  test("should create shutdown plugin with custom timeout", () => {
    const app = createApp({ logger: false });
    const plugin = shutdown({ timeout: 10000 });

    expect(plugin).toBeDefined();

    app.close();
  });

  test("should register shutdown plugin successfully", async () => {
    const app = createApp({ logger: false });
    app.register(shutdown());

    await app.ready();

    await app.close();
  });
});
