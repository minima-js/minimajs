import type { Serializer } from "../interfaces/response.js";

export const serialize: Serializer<any> = (body: unknown, ctx) => {
  if (typeof body === "string" || body instanceof Blob || body instanceof ReadableStream) {
    return body;
  }
  const { responseState: response } = ctx;
  if (!response.headers.has("Content-Type")) {
    response.headers.set("Content-Type", "application/json");
  }
  return JSON.stringify(body);
};
