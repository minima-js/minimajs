import { wrap } from "../internal/context.js";
import type { Request, Response } from "../types.js";
import { createRequest, type MockRequestOptions } from "./request.js";
import { createResponse } from "./response.js";

export type MockContextCallback<T> = (request: Request, response: Response) => T;

export function mockContext<T>(callback: MockContextCallback<T>, reqOptions: MockRequestOptions = {}): T {
  const request = createRequest(reqOptions);
  const response = createResponse({ request: request });
  return wrap(request, response, () => callback(request, response)) as T;
}
