import { createContext } from "./context.js";

const [getCleaner] = createContext<CallableFunction[]>([]);

export function cleanup(cb: CallableFunction) {
  const cleaners = getCleaner();
  cleaners.push(cb);
}

export async function doClean() {
  const cleaner = getCleaner();
  for (const cb of cleaner) {
    await cb();
  }
}
