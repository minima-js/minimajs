import { kResponseDecorator } from "./internal/symbol.js";
import type { App } from "./types.js";

export type ResponseDecorator = (body: unknown) => Promise<unknown> | unknown;

export function decorateResponse(app: App, cb: ResponseDecorator) {
  app.decorate(kResponseDecorator, cb);
}
