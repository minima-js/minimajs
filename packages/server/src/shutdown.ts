import type { FastifyBaseLogger } from "fastify";
import type { Signals } from "./types.js";

export type QuitHandler = () => Promise<void>;
export function shutdownListener(
  quitHandler: QuitHandler,
  killSignal: Signals[],
  logger: FastifyBaseLogger,
  process: NodeJS.Process
) {
  async function quit(sig: Signals) {
    logger.info(`%s: closing server`, sig);
    console.time("server closed");
    await quitHandler();
    console.timeEnd("server closed");
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
