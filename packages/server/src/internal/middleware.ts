import type { Context } from "../interfaces/index.js";
import type { Middleware, MiddlewareNext } from "../interfaces/app.js";

export function composeMiddleware(middlewares: Middleware[]) {
  if (middlewares.length === 1) return middlewares[0]!;

  return function wrap(ctx: Context, callback: MiddlewareNext): Promise<Response> {
    let index = -1;

    const dispatch = (i: number): Promise<Response> => {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }

      index = i;
      const mw = middlewares[i];

      if (!mw) {
        return callback();
      }

      return mw(ctx, () => dispatch(i + 1));
    };

    return dispatch(0);
  };
}
