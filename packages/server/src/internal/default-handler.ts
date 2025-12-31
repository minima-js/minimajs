import { BaseHttpError } from "../error.js";
import type { App } from "../index.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";
import { $context } from "./context.js";
import { createResponseFromState } from "./response.js";

export const serialize: Serializer = (body: unknown, _req) => {
  if (body instanceof ReadableStream) return body;
  if (typeof body === "string") return body;
  const { resInit: response } = $context();
  response.headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
};

export const errorHandler: ErrorHandler = async (error: unknown, req: Request, app: App) => {
  if (error instanceof BaseHttpError) {
    const ctx = $context();
    return error.render(ctx);
  }
  // For non-HTTP errors, return a generic message to avoid leaking internal details
  const errorBody = { message: "Unable to process request" };
  return createResponseFromState(await app.serialize(errorBody, req), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
