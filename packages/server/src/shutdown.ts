import type { App } from "./types.js";
type Signal = NodeJS.Signals;

export function shutdownListener(app: App, killSignal: Signal[]) {
  async function quit(sig: Signal) {
    app.log.info(`%s: closing server`, sig);
    console.time("server closed");
    await app.close();
    console.timeEnd("server closed");
    next(sig);
  }

  function next(sig: Signal) {
    // Remove the existing listener to prevent the possibility of the 'quit' function being executed again by the 'process.kill' function.
    process.off(sig, quit);
    // Verify that identical signals are not reattached before terminating the process with the same signal.
    if (process.listeners(sig).length === 0) {
      process.kill(process.pid, sig);
    }
  }

  killSignal.forEach((signal) => process.on(signal, quit));
}
