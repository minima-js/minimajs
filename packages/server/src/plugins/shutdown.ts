import type { Signals } from "../interfaces/index.js";
import { plugin } from "../internal/plugins.js";

export interface GracefulShutdownOptions {
  /** Array of signals to listen for (e.g., ['SIGINT', 'SIGTERM']) */
  signals?: Signals[];
  /** Timeout in milliseconds before forcing process exit. Defaults to 30000ms (30 seconds) */
  timeout?: number;
}

/**
 * Creates a plugin for graceful server shutdown.
 *
 * Handles specified process signals by gracefully shutting down the server.
 * Calls app.close() which stops the server and runs close hooks.
 * Includes timeout protection to prevent hung shutdowns.
 *
 * @param options - Configuration options for graceful shutdown
 * @param options.signals - Array of process signals to listen for (default: ['SIGINT', 'SIGTERM'])
 * @param options.timeout - Timeout in milliseconds before forcing exit (default: 30000ms)
 *
 * @returns A plugin that sets up graceful shutdown handlers
 *
 * @example
 * ```typescript
 * import { gracefulShutdown } from '@minimajs/server/plugins';
 *
 * app.register(gracefulShutdown());
 * ```
 */
export function gracefulShutdown({ signals = ["SIGINT", "SIGTERM"], timeout = 30_000 }: GracefulShutdownOptions = {}) {
  return plugin.sync((app) => {
    shutdownListener(() => app.close(), signals, timeout, process);
  });
}

export type QuitHandler = () => Promise<void>;
/**
 * Registers shutdown signal handlers for graceful server termination.
 * Listens for specified kill signals and executes cleanup before process exit.
 */
export function shutdownListener(
  quitHandler: QuitHandler,
  killSignal: Signals[],
  timeout: number,
  process: NodeJS.Process
) {
  let isShuttingDown = false;

  async function quit(sig: Signals) {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    const timeoutHandle = setTimeout(() => {
      process.exit(1);
    }, timeout);
    timeoutHandle.unref();

    await quitHandler();
    clearTimeout(timeoutHandle);
    next(sig);
  }

  function next(sig: Signals) {
    // Remove the existing listener to prevent the possibility of the 'quit' function being executed again by the 'process.kill' function.
    process.off(sig, quit);
    // Verify that identical signals are not reattached before terminating the process with the same signal.
    if (process.listeners(sig).length === 0) {
      process.kill(process.pid, sig);
    }
  }
  killSignal.forEach((signal) => process.on(signal, quit));
}
