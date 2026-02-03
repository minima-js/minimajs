import type { Container } from "../interfaces/app.js";
import type { App } from "../interfaces/index.js";
import { createHooksStore } from "../hooks/store.js";
import { isCallable } from "../utils/callable.js";

import { kMiddlewares, kHooks, kAppDescriptor, kModulesChain } from "../symbols.js";
/**
 * Checks if a value has a clone method
 */
function cloneable(value: unknown): value is { clone(): unknown } {
  return isCallable((value as any)?.clone);
}

export function createRootContainer<S>(server: App<S>) {
  return {
    $rootMiddleware(_ctx, cb) {
      return cb();
    },
    [kMiddlewares]: new Set(),
    [kHooks]: createHooksStore(),
    [kAppDescriptor]: [],
    [kModulesChain]: [server],
  } satisfies Container<S>;
}

/**
 * Clones a container by iterating symbol properties and conditionally cloning values
 */
export function cloneContainer<S>(container: Container<S>): Container<S> {
  const newContainer: Container<S> = {} as Container<S>;
  // Iterate over symbol properties
  for (const key of Object.getOwnPropertySymbols(container)) {
    const value = container[key];
    if (Array.isArray(value)) {
      newContainer[key] = [...value];
      continue;
    }
    if (cloneable(value)) {
      newContainer[key] = value.clone();
      continue;
    }
    newContainer[key] = value;
  }
  newContainer.$rootMiddleware = container.$rootMiddleware;
  return newContainer;
}
