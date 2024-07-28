import { setPluginOption } from "../internal/plugins.js";
import type { App, Request } from "../types.js";

type DecoratorHandler<T> = [option: DecoratorOptions, handler: T];

function getDecorator<T>(app: any, name: symbol) {
  return app[name] as Set<DecoratorHandler<T>>;
}
export interface DecoratorOptions {
  filter(req: Request): boolean | Promise<boolean>;
}
export function createDecoratorHandler<T extends (p: unknown) => unknown>(decoratorType: string) {
  type Result = Awaited<ReturnType<T>>;
  type Param = Parameters<T>[0];

  const symbol = Symbol(decoratorType);

  function add(app: App, option: DecoratorOptions, cb: T) {
    let existing = getDecorator<T>(app, symbol);
    if (!existing) {
      existing = new Set();
      app.decorate(symbol, existing);
    }
    existing.add([option, cb]);
  }

  async function getDecorated(app: App, req: Request, param: Param): Promise<Result | Param> {
    const callbacks = getDecorator<T>(app, symbol);
    if (!callbacks) return param;
    let result = param;
    for (const [option, callback] of callbacks) {
      if (option.filter && !(await option.filter(req))) {
        return result;
      }
      result = await callback(result);
    }
    return result;
  }
  function createDecorator(cb: T) {
    function decorator(app: App, opt: DecoratorOptions, next: CallableFunction) {
      add(app, opt, cb);
      next();
    }
    setPluginOption(decorator, { override: true, name: cb.name ?? decoratorType });
    return decorator;
  }
  return [createDecorator, getDecorated] as const;
}
