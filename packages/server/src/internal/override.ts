import type { App, Registerable, Container } from "../interfaces/index.js";
import { isCallable } from "../utils/callable.js";
import { plugin } from "./plugins.js";
import { kModuleName, kModulesChain } from "../symbols.js";

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
  name?: string;
}

export function pluginOverride(app: App, fn: Registerable, options: Options = {}): App {
  if (plugin.is(fn)) return app;

  const { $prefix: parentPrefix = "", $prefixExclude: parentExclude = [] } = app;

  const child: App = Object.create(app, {
    container: {
      value: cloneContainer(app.container),
    },
    $prefix: {
      value: options.prefix ? parentPrefix + options.prefix : parentPrefix,
    },
    $prefixExclude: {
      value: [...parentExclude],
    },
    $parent: {
      value: app,
    },
  });

  (child.container.get(kModulesChain) as App[])?.push(child);
  child.container.set(kModuleName, plugin.getName(fn, options));
  return child;
}
