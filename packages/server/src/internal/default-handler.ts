import type { Serializer } from "../interfaces/response.js";

export const defaultSerializer: Serializer = (_req, _res, body: unknown) => {
  if (body instanceof ReadableStream) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};
