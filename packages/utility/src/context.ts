import { AsyncLocalStorage } from "node:async_hooks";

export function createContext<T>(def?: T) {
  const als = new AsyncLocalStorage<T>();
  function wrap(data: T, callback: () => any) {
    return als.run(data, callback);
  }

  function getContext() {
    const context = als.getStore();
    if (context === undefined) {
      return def;
    }
    return context;
  }

  return [getContext, wrap] as const;
}
