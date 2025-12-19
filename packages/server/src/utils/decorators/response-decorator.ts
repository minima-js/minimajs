import type { App, Request, Response } from "../../types.js";
import { createDecoratorPlugin, getDecorator } from "./helpers.js";

export type ResponseDecorator = (body: unknown) => Promise<unknown> | unknown;

/**
 * Creates a response decorator handler system for transforming response bodies.
 * Returns a tuple of [createDecorator, getDecorated] functions for registering and executing response decorators.
 * Response decorators are executed in sequence and can transform responses before sending.
 */
export function createResponseDecoratorHandler() {
  const symbol = Symbol("response-decorator");
  async function getDecorated(app: App, req: Request, body: unknown) {
    const callbacks = getDecorator<ResponseDecorator>(app, symbol);
    if (!callbacks) return body;
    let result = body;
    for (const [option, callback] of callbacks) {
      if (option.filter && !(await option.filter(req))) {
        continue;
      }
      result = await callback(result);
    }
    return result;
  }
  function createDecorator(cb: ResponseDecorator) {
    return createDecoratorPlugin(symbol, symbol.description!, cb);
  }
  return [createDecorator, getDecorated] as const;
}

const SkipResponseDecorator = Symbol("response-no-decorate");

/**
 * Checks if response decorator has been skipped for a given response.
 * Used internally to prevent double-decoration of error responses.
 */
export function isResponseDecoratorSkipped(response: Response): boolean {
  return (response as any)[SkipResponseDecorator];
}

/**
 * Marks a response to skip decorator processing.
 * Used to prevent response decorators from running on error responses.
 */
export function skipResponseDecorator(response: Response) {
  (response as any)[SkipResponseDecorator] = true;
}
