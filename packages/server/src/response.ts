import { kResponseDecorator } from "./internal/symbol.js";
import type { App } from "./types.js";

export type ResponseDecorator = (body: unknown) => Promise<unknown> | unknown;

/**
 * Sometimes you might need to include additional information besides the main data payload. This is where decorating the response comes in.
 */
export function decorateResponse(app: App, cb: ResponseDecorator) {
  app.decorate(kResponseDecorator, cb);
}
