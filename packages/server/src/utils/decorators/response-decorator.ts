import type { App, Request, Response } from "../../types.js";
import { createDecoratorPlugin, getDecorator } from "./helpers.js";

export type ResponseDecorator = (body: unknown) => Promise<unknown> | unknown;

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

export function isResponseDecoratorSkipped(response: Response): boolean {
  return (response as any)[SkipResponseDecorator];
}
export function skipResponseDecorator(response: Response) {
  (response as any)[SkipResponseDecorator] = true;
}
