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
 * Clones a container by iterating symbol properties and conditionally cloning values
 */
function cloneContainer(container: Container): Container {
  const newContainer: Container = {};
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

  (child.container[kModulesChain] as App[])?.push(child);
  child.container[kModuleName] = plugin.getName(fn, options);
  return child;
}
