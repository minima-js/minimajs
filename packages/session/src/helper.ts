import { getInstance } from "./index.js";
import type { Facade } from "./session.js";

export function flush(session: Facade) {
  getInstance(session).flush();
}

export function regenerate(session: Facade) {
  return getInstance(session).regenerate();
}
