import { cloneHooksStore } from "../hooks/manager.js";
import { type App } from "../interfaces/app.js";

export function pluginOverride(app: App, fn: any) {
  if (fn[Symbol.for("skip-override")]) return app;
  return Object.create(app, {
    hooks: {
      value: cloneHooksStore(app.hooks),
    },
    container: {
      value: new Map(app.container),
    },
  });
}
