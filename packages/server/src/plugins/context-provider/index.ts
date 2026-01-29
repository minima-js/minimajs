import type { Context, Middleware } from "../../interfaces/index.js";
import { plugin } from "../../plugin.js";
import { kMiddlewares } from "../../symbols.js";
import { runHooks } from "../../hooks/store.js";
import { handleError } from "./error-handler.js";

const kContextRunner = Symbol("minimajs.context.wrapper");

export function contextProvider(callback: Middleware) {
  const provider: Middleware = (ctx: Context, next) => {
    return callback(ctx, async () => {
      let response: Response;
      try {
        response = await next();
      } catch (err) {
        response = await handleError(err, ctx);
      }
      await runHooks.send(ctx.app, response, ctx);
      return response;
    });
  };

  return plugin.sync((app) => {
    app.container[kMiddlewares].delete(app.container[kContextRunner] as Middleware);
    app.container[kContextRunner] = provider;
    app.container[kMiddlewares].add(provider);
  });
}
