import type { Middleware } from "../../interfaces/index.js";
import { plugin } from "../../plugin.js";
import { kMiddlewares } from "../../symbols.js";

const kContextRunner = Symbol("minimajs.context.wrapper");
export function contextProvider(callback: Middleware) {
  return plugin.sync((app) => {
    app.container[kMiddlewares].delete(app.container[kContextRunner] as Middleware);
    app.container[kContextRunner] = callback;
    app.container[kMiddlewares].add(callback);
  });
}
