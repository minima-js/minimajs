import { BaseHttpError } from "../error.js";
import type { Context } from "../index.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";
import { createResponseFromState } from "./response.js";

export const serialize: Serializer<any> = (body: unknown, ctx) => {
  if (body instanceof ReadableStream) return body;
  if (typeof body === "string") return body;
  const { responseState: response } = ctx;
  response.headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
};

export const errorHandler: ErrorHandler<any> = async (error: unknown, ctx: Context<any>) => {
  if (error instanceof BaseHttpError) {
    return error.render(ctx);
  }
  ctx.app.log.error(error);
  // For non-HTTP errors, return a generic message to avoid leaking internal details
  const errorBody = { message: "Unable to process request" };
  return createResponseFromState(await ctx.app.serialize(errorBody, ctx), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
