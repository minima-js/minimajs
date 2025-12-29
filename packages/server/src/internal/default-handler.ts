import { BaseHttpError } from "../error.js";
import type { App } from "../index.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";
import { context } from "./context.js";

export const serialize: Serializer = (body: unknown, _req) => {
  if (body instanceof ReadableStream) return body;
  if (typeof body === "string") return body;
  const { resInit: response } = context();
  response.headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
};

export const errorHandler: ErrorHandler = async (error: unknown, req: Request, app: App) => {
  if (error instanceof BaseHttpError) {
    return error.render(app, req);
  }
  return new Response(await app.serialize(error, req), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
