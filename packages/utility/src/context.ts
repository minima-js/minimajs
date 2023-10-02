import { AsyncLocalStorage } from "node:async_hooks";

export function createContext<T>() {
  const als = new AsyncLocalStorage<T>();
  function wrap(data: T, callback: () => any) {
    return als.run(data, callback);
  }
  function getContext() {
    return als.getStore();
  }
  return [getContext, wrap] as const;
}
