import type { App } from "./types.js";
type Signal = NodeJS.Signals;

export function shutdownListener(app: App, killSignal: Signal[]) {
  let hasBeenTriggered = false;
  async function quit(sig: Signal) {
    if (hasBeenTriggered) return;
    hasBeenTriggered = true;
    app.log.info(`${sig}: %s`, "closing server");
    await app.close();
    app.log.info("finished all requests");
    process.kill(process.pid, sig);
  }
  killSignal.forEach((signal) => process.on(signal, quit));
}
