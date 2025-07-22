import { createPluginSync } from "../../internal/plugins.js";
import type { App, GenericCallback, Request } from "../../types.js";

type DecoratorHandler<T extends GenericCallback> = [option: DecoratorOptions, handler: T];

export interface DecoratorOptions {
  filter?(req: Request): boolean | Promise<boolean>;
}

function addDecorator<T extends GenericCallback>(id: symbol, app: App, option: DecoratorOptions, cb: T) {
  let existing = getDecorator<T>(app, id);
  if (!existing) {
    existing = new Set();
    app.decorate(id, existing);
  }
  existing.add([option, cb]);
}

export function getDecorator<T extends GenericCallback>(app: any, name: symbol) {
  return app[name] as Set<DecoratorHandler<T>> | undefined;
}

export function createDecoratorPlugin(id: symbol, decoratorType: string, cb: GenericCallback) {
  return createPluginSync<DecoratorOptions>(function decorator(app, opt, next) {
    addDecorator(id, app, opt, cb);
    next();
  }, cb.name ?? decoratorType);
}
