import { RedirectError, BaseHttpError } from "../../error.js";
import { runHooks } from "../../hooks/store.js";
import type { Context } from "../../interfaces/context.js";
import { createResponse } from "../../internal/response.js";
import { kHooks } from "../../symbols.js";

export async function handleError(err: unknown, ctx: Context): Promise<Response> {
  // Handle redirects specially
  if (err instanceof RedirectError) {
    return err.render(ctx);
  }

  const hooks = ctx.app.container[kHooks];

  // If error hooks are registered, run them
  if (hooks.error.size > 0) {
    try {
      return await createResponse(await runHooks.error(ctx.app, err, ctx), {}, ctx);
    } catch {
      // If error hook throws, fall through to default handling
    }
  }

  // Handle HTTP errors (they know how to render themselves)
  if (err instanceof BaseHttpError) {
    return err.render(ctx);
  }

  // Log non-HTTP errors
  ctx.app.log.error(err);

  // Return generic error response
  const errorBody = { message: "Unable to process request" };
  return createResponse(errorBody, { status: 500 }, ctx);
}
