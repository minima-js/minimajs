import { createHooksStore } from "../hooks/manager.js";
import { type App } from "../interfaces/app.js";
import { kSkipOverride } from "../symbols.js";

export function pluginOverride(app: App, fn: any) {
  if (fn[kSkipOverride]) return app;
  return Object.create(app, {
    hooks: {
      value: createHooksStore(app.hooks),
    },
    container: {
      value: new Map(app.container),
    },
  });
}
