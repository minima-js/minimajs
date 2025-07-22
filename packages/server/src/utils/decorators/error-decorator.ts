import type { App, Request } from "../../types.js";
import { createDecoratorPlugin, getDecorator } from "./helpers.js";

export type ErrorDecorator = (error: unknown, body: unknown) => Promise<unknown> | unknown;

export function createErrorDecoratorHandler() {
  const symbol = Symbol("error-decorator");
  async function getDecorated(app: App, req: Request, error: unknown) {
    const callbacks = getDecorator<ErrorDecorator>(app, symbol);
    if (!callbacks) throw error;
    let result = undefined;
    for (const [option, callback] of callbacks) {
      if (option.filter && !(await option.filter(req))) {
        continue;
      }
      try {
        result = await callback(error, result);
      } catch (err) {
        error = err;
        result = undefined;
      }
    }
    if (result !== undefined) {
      return result;
    }
    throw error;
  }

  function createDecorator(cb: ErrorDecorator) {
    return createDecoratorPlugin(symbol, symbol.description!, cb);
  }
  return [createDecorator, getDecorated] as const;
}
