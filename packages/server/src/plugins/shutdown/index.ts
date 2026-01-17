import type { Signals } from "../../interfaces/index.js";
import { plugin } from "../../plugin.js";
import { shutdownListener } from "./listener.js";

export interface ShutdownOptions {
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
export function shutdown({ signals = ["SIGINT", "SIGTERM"], timeout = 30_000 }: ShutdownOptions = {}) {
  return plugin.sync((app) => {
    shutdownListener(() => app.close(), signals, timeout, process);
  });
}

export type QuitHandler = () => Promise<void>;
