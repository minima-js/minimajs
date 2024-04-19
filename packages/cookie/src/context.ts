import { getContext } from "@minimajs/server/context";
import type { Request, Response } from "./types.js";

export function getRequest() {
  return getContext().req as unknown as Request;
}

export function getResponse() {
  return getContext().reply as unknown as Response;
}
