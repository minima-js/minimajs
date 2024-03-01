import { kResponseDecorator } from "./internal/symbol.js";
import type { App } from "./types.js";

export type Decorator = (body: unknown) => Promise<unknown> | unknown;

export function decorate(app: App, cb: Decorator) {
  app.decorate(kResponseDecorator, cb);
}
