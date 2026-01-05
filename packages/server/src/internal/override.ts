import { type App, type Container } from "../interfaces/app.js";
import { kPluginSkipOverride } from "../symbols.js";
import { isCallable } from "../utils/callable.js";

/**
 * Checks if a value has a clone method
 */
function isClonable(value: unknown): value is { clone(): unknown } {
  return value !== null && typeof value === "object" && "clone" in value && isCallable((value as any).clone);
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
    if (isClonable(value)) {
      newContainer.set(key, value.clone());
      continue;
    }
    newContainer.set(key, value);
  }
  return newContainer;
}

export function pluginOverride(app: App, fn: any, options: any) {
  if (fn[kPluginSkipOverride]) return app;
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
