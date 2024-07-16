import type { App } from "../types.js";
function getCallbacks<T>(app: any, name: symbol, ensure: true): Set<T>;
function getCallbacks<T>(app: any, name: symbol): undefined | Set<T>;
function getCallbacks<T>(app: any, name: symbol, ensure = false): Set<T> {
  if (!ensure) {
    return app[name];
  }
  if (!app[name]) {
    app.decorate(name, new Set<T>());
  }
  return app[name];
}

export function createDecoratorHandler<T extends (p: unknown) => unknown>(symbol: string) {
  type Result = Awaited<ReturnType<T>>;
  type Param = Parameters<T>[0];

  const name = Symbol(symbol);

  function add(app: App, cb: T) {
    getCallbacks(app, name, true).add(cb);
  }

  async function decorate(app: App, param: Param): Promise<Result | Param> {
    const callbacks = getCallbacks<T>(app, name);
    if (!callbacks) return param;
    let result = param;
    for (const callback of callbacks) {
      result = await callback(result);
    }
    return result;
  }
  return [add, decorate] as const;
}
