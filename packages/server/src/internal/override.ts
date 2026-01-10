import { type App, type Container } from "../interfaces/app.js";
import { isCallable } from "../utils/callable.js";
import { plugin } from "./plugins.js";

/**
 * Checks if a value has a clone method
 */
function cloneable(value: unknown): value is { clone(): unknown } {
  return isCallable((value as any)?.clone);
}

/**
 * Clones a container by creating a new Map and cloning values that have a clone() method
 */
function cloneContainer(container: Container): Container {
  const newContainer: Container = new Map();
  for (const [key, value] of container) {
    if (Array.isArray(value)) {
      newContainer.set(key, [...value]);
      continue;
    }
    if (cloneable(value)) {
      newContainer.set(key, value.clone());
      continue;
    }
    newContainer.set(key, value);
  }
  return newContainer;
}

interface Options {
  prefix?: string;
}
export function pluginOverride(app: App, fn: CallableFunction, options: Options = {}) {
  if (plugin.is(fn)) return app;
  const { $prefix: parentPrefix = "", $prefixExclude: parentExclude = [] } = app as any;
  return Object.create(app, {
    container: {
      value: cloneContainer(app.container),
    },
    $prefix: {
      value: options.prefix ? parentPrefix + options.prefix : parentPrefix,
    },
    $prefixExclude: {
      value: [...parentExclude],
    },
  });
}
