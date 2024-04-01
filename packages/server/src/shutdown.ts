import type { App } from "./types.js";
type Signal = NodeJS.Signals;

export function shutdownListener(app: App, killSignal: Signal[]) {
  async function quit(sig: Signal) {
    app.log.info(`${sig}: %s`, "closing server");
    await app.close();
    app.log.info("finished all requests");
    // check if same signals are not attached again then quit the app.
    if (process.listeners(sig).filter((x) => x !== quit).length === 0) {
      process.kill(process.pid, sig);
    }
  }
  killSignal.forEach((signal) => process.on(signal, quit));
}
