import { createPluginSync } from "../../internal/plugins.js";
import type { App, GenericCallback, Request } from "../../types.js";

type DecoratorHandler<T extends GenericCallback> = [option: DecoratorOptions, handler: T];

export interface DecoratorOptions {
  filter?(req: Request): boolean | Promise<boolean>;
}

/**
 * Adds a decorator callback to the app's decorator registry.
 * Creates the decorator set if it doesn't exist and registers the handler with its options.
 */
function addDecorator<T extends GenericCallback>(id: symbol, app: App, option: DecoratorOptions, cb: T) {
  let existing = getDecorator<T>(app, id);
  if (!existing) {
    existing = new Set();
    app.decorate(id, existing);
  }
  existing.add([option, cb]);
}

/**
 * Retrieves all registered decorators for a given symbol identifier.
 * Returns undefined if no decorators have been registered for this identifier.
 */
export function getDecorator<T extends GenericCallback>(app: App, name: symbol) {
  return (app as any)[name] as Set<DecoratorHandler<T>> | undefined;
}

/**
 * Creates a Fastify plugin that registers a decorator callback.
 * The plugin can be registered with optional filter options to conditionally apply decorators.
 */
export function createDecoratorPlugin(id: symbol, decoratorType: string, cb: GenericCallback) {
  return createPluginSync<DecoratorOptions>(function decorator(app, opt, next) {
    addDecorator(id, app, opt, cb);
    next();
  }, cb.name ?? decoratorType);
}
