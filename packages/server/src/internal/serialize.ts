import type { Serializer } from "../interfaces/response.js";

export const serialize: Serializer<any> = (body: unknown, ctx) => {
  if (body instanceof ReadableStream) return body;
  if (typeof body === "string") return body;
  const { responseState: response } = ctx;
  if (!response.headers.has("Content-Type")) {
    response.headers.set("Content-Type", "application/json");
  }
  return JSON.stringify(body);
};
