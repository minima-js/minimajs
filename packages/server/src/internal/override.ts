import { type App, type Container } from "../interfaces/app.js";
import { kPluginSkipOverride } from "../symbols.js";

/**
 * Checks if a value has a clone method
 */
function isClonable(value: unknown): value is { clone(): unknown } {
  return value !== null && typeof value === "object" && "clone" in value && typeof (value as any).clone === "function";
}

/**
 * Clones a container by creating a new Map and cloning values that have a clone() method
 */
function cloneContainer(container: Container): Container {
  const newContainer: Container = new Map();
  for (const [key, value] of container) {
    if (isClonable(value)) {
      newContainer.set(key, value.clone());
    } else {
      newContainer.set(key, value);
    }
  }
  return newContainer;
}

export function pluginOverride(app: App, fn: any) {
  if (fn[kPluginSkipOverride]) return app;
  return Object.create(app, {
    container: {
      value: cloneContainer(app.container),
    },
  });
}
