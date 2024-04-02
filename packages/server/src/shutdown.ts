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
    // removing existing listener, otherwise function quite might execute again by process.kill function.
    process.off(sig, quit);
    // check if same signals are not attached again then quit the app.
    if (process.listeners(sig).length === 0) {
      process.kill(process.pid, sig);
    }
  }

  killSignal.forEach((signal) => process.on(signal, quit));
}
