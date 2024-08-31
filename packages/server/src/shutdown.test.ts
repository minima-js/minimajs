import type { FastifyBaseLogger as Logger } from "fastify";
import { shutdownListener, type QuitHandler } from "./shutdown.js";
import type { Signals } from "./types.js";
import { jest } from "@jest/globals";

describe("shutdownListener", () => {
  let quitHandler: QuitHandler;
  let mockLogger: Logger;
  let mockProcess: NodeJS.Process;
  const killSignal: Signals[] = ["SIGINT", "SIGTERM"];

  beforeEach(() => {
    quitHandler = jest.fn(() => Promise.resolve());
    mockLogger = { info: jest.fn() } as unknown as Logger;
    mockProcess = {
      on: jest.fn(),
      off: jest.fn(),
      kill: jest.fn(),
      listeners: jest.fn().mockReturnValue([]),
      pid: 1234,
    } as unknown as NodeJS.Process;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should set up listeners for each kill signal", () => {
    shutdownListener(quitHandler, killSignal, mockLogger, mockProcess);
    expect(mockProcess.on).toHaveBeenCalledTimes(killSignal.length);
    killSignal.forEach((signal) => {
      expect(mockProcess.on).toHaveBeenCalledWith(signal, expect.any(Function));
    });
  });

  it("should call quitHandler and log information when signal is received", async () => {
    shutdownListener(quitHandler, killSignal, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockLogger.info).toHaveBeenCalledWith("%s: closing server", "SIGINT");
    expect(quitHandler).toHaveBeenCalled();
    expect(mockProcess.off).toHaveBeenCalledWith("SIGINT", quit);
  });

  it("should kill the process after quitHandler is called", async () => {
    shutdownListener(quitHandler, killSignal, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockProcess.kill).toHaveBeenCalledWith(mockProcess.pid, "SIGINT");
  });

  it("should not kill the process if listeners still exist", async () => {
    (mockProcess.listeners as any).mockReturnValue([jest.fn()]);
    shutdownListener(quitHandler, killSignal, mockLogger, mockProcess);
    const quit = (mockProcess.on as any).mock.calls[0][1]; // Get the quit function from the first signal listener

    await quit("SIGINT");

    expect(mockProcess.kill).not.toHaveBeenCalled();
  });
});
