import { context } from "@minimajs/server/context";
import type { Request, Response } from "./types.js";

export function $request() {
  return context().req as unknown as Request;
}

export function $response() {
  return context().reply as unknown as Response;
}
