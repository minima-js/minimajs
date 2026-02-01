import { RedirectError, BaseHttpError } from "../../error.js";
import { runHooks } from "../../hooks/store.js";
import type { Context } from "../../interfaces/context.js";
import { createResponse } from "../../internal/response.js";

export async function handleError(err: unknown, ctx: Context): Promise<Response> {
  // Handle redirects specially
  if (err instanceof RedirectError) {
    return err.render(ctx);
  }

  // If error hooks are registered, run them
  try {
    return await createResponse(await runHooks.error(ctx.app, err, ctx), {}, ctx);
  } catch (_err) {
    // If error hook throws, fall through to default handling
    err = _err;
  }

  // Handle HTTP errors (they know how to render themselves)
  if (err instanceof BaseHttpError) {
    return err.render(ctx);
  }

  // Log non-HTTP errors
  ctx.app.log.error(err);

  // Return generic error response
  return createResponse({ message: "Unable to process request" }, { status: 500 }, ctx);
}
