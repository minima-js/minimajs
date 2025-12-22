import { plugin } from "../../internal/plugins.js";
import type { App, GenericCallback, Request } from "../../types.js";

export interface DecoratorOptions {
  filter?(req: Request): boolean | Promise<boolean>;
}

/**
 * Adds a decorator callback to the app's decorator registry.
 * Creates the decorator set if it doesn't exist and registers the handler with its options.
 */
function addDecorator<T extends GenericCallback>(id: symbol, app: App, option: DecoratorOptions, cb: T): void {
  const decorators = new Map(getDecorator<T>(app, id));
  decorators.set(cb, option);
  (app as any)[id] = decorators;
}

/**
 * Retrieves all registered decorators for a given symbol identifier.
 * Returns undefined if no decorators have been registered for this identifier.
 */
export function getDecorator<T extends GenericCallback>(app: App, name: symbol): Map<T, DecoratorOptions> | undefined {
  return (app as any)[name] as Map<T, DecoratorOptions> | undefined;
}

/**
 * Creates a Fastify plugin that registers a decorator callback.
 * The plugin can be registered with optional filter options to conditionally apply decorators.
 */
export function createDecoratorPlugin(id: symbol, decoratorType: string, cb: GenericCallback) {
  return plugin.sync<DecoratorOptions>(function decorator(app, opt) {
    addDecorator(id, app, opt, cb);
  }, cb.name ?? decoratorType);
}
