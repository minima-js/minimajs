import type { FastifyBaseLogger as Logger } from "fastify";
import { shutdownListener, type QuitHandler } from "./shutdown.js";
import type { Signals } from "../types.js";
import { jest } from "@jest/globals";

describe("shutdownListener", () => {
  let quitHandler: QuitHandler;
  let mockLogger: Logger;
  let mockProcess: NodeJS.Process;
  const killSignal: Signals[] = ["SIGINT", "SIGTERM"];
  const timeout = 5000;

  beforeEach(() => {
    jest.useFakeTimers();
    quitHandler = jest.fn(() => Promise.resolve());
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
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

  it("should set up listeners for each kill signal", () => {
    shutdownListener(quitHandler, killSignal, timeout, mockLogger, mockProcess);
    expect(mockProcess.on).toHaveBeenCalledTimes(killSignal.length);
    killSignal.forEach((signal) => {
      expect(mockProcess.on).toHaveBeenCalledWith(signal, expect.any(Function));
    });
  });

  it("should call quitHandler and log information when signal is received", async () => {
    shutdownListener(quitHandler, killSignal, timeout, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockLogger.info).toHaveBeenCalledWith("%s: closing server", "SIGINT");
    expect(quitHandler).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("server closed in"));
    expect(mockProcess.off).toHaveBeenCalledWith("SIGINT", quit);
  });

  it("should kill the process after quitHandler is called", async () => {
    shutdownListener(quitHandler, killSignal, timeout, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockProcess.kill).toHaveBeenCalledWith(mockProcess.pid, "SIGINT");
  });

  it("should not kill the process if listeners still exist", async () => {
    (mockProcess.listeners as any).mockReturnValue([jest.fn()]);
    shutdownListener(quitHandler, killSignal, timeout, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockProcess.kill).not.toHaveBeenCalled();
  });

  it("should prevent duplicate shutdown attempts", async () => {
    shutdownListener(quitHandler, killSignal, timeout, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1];

    // Start first shutdown
    const firstShutdown = quit("SIGINT");
    // Attempt second shutdown while first is in progress
    await quit("SIGTERM");

    expect(mockLogger.warn).toHaveBeenCalledWith("%s: shutdown already in progress", "SIGTERM");
    expect(quitHandler).toHaveBeenCalledTimes(1); // Only called once

    // Complete first shutdown
    await firstShutdown;
  });

  it("should force exit after timeout if shutdown hangs", async () => {
    const hangingQuitHandler = jest.fn(() => new Promise<void>(() => {})); // Never resolves
    shutdownListener(hangingQuitHandler, killSignal, timeout, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1];

    // Start shutdown
    quit("SIGINT");

    // Fast-forward time past timeout
    jest.advanceTimersByTime(timeout);

    expect(mockLogger.error).toHaveBeenCalledWith(`Shutdown timeout after ${timeout}ms, forcing exit`);
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });

  it("should clear timeout if shutdown completes successfully", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    shutdownListener(quitHandler, killSignal, timeout, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1];

    await quit("SIGINT");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(mockProcess.exit).not.toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
