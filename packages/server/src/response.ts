import { setPluginOption } from "./internal/plugins.js";
import { addResponseDecorator } from "./internal/response.js";
import type { App } from "./types.js";
import type { ResponseDecorator } from "./internal/response.js";
export type { ResponseDecorator };

/**
 * Sometimes you might need to include additional information besides the main data payload. This is where decorating the response comes in.
 * @since v0.1.0
 */
export function createResponseDecorator(cb: ResponseDecorator) {
  function decorator(app: App, _: {}, next: CallableFunction) {
    addResponseDecorator(app, cb);
    next();
  }
  setPluginOption(decorator, { override: true, name: "response-decorator" });
  return decorator;
}
