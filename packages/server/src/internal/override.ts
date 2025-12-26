import { type App } from "../interfaces/app.js";

export function pluginOverride(app: App, fn: any) {
  if (fn[Symbol.for("skip-override")]) return app;
  return Object.create(app, {
    hooks: {
      value: new Map(app.hooks),
    },
    container: {
      value: new Map(app.container),
    },
  });
}
