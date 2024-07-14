import type { App } from "../types.js";
function getCallbacks<T>(app: any, name: symbol): Set<T> {
  if (!app[name]) {
    app.decorate(name, new Set<T>());
  }
  return app[name];
}

export function createDecoratorHandler<T extends (p: unknown) => unknown>() {
  type Result = Awaited<ReturnType<T>>;
  type Param = Parameters<T>[0];

  const name = Symbol("custom-decorator");

  function add(app: App, cb: T) {
    getCallbacks(app, name).add(cb);
  }

  async function decorate(app: App, param: Param): Promise<Result | Param> {
    const callbacks = getCallbacks<T>(app, name);
    let result = param;
    for (const callback of callbacks) {
      result = await callback(result);
    }
    return result;
  }
  return [add, decorate] as const;
}
