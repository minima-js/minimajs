import type { Signals } from "../../interfaces/index.js";
import type { QuitHandler } from "./index.js";


/**
 * Registers shutdown signal handlers for graceful server termination.
 * Listens for specified kill signals and executes cleanup before process exit.
 */
export function shutdownListener(quitHandler: QuitHandler, killSignal: Signals[], timeout: number, process: NodeJS.Process) {
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
