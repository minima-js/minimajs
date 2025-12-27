import type { ErrorHandler, Serializer } from "../interfaces/response.js";

export const defaultSerializer: Serializer = (body: unknown, _req, _res) => {
  if (body instanceof ReadableStream) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};

export const errorHandler: ErrorHandler = (error: unknown, _req: Request) => {
  return new Response(typeof error === "string" ? error : JSON.stringify({ error }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
