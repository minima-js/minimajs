import { getHooks, type HookCallback } from "./internal/context.js";
import type { App, AppListenerCallback } from "./types.js";

export function defer(cb: HookCallback) {
  const hooks = getHooks();
  hooks.onSent.add(cb);
}

const appListeners = new Set<AppListenerCallback>();

export function onCreate(callback: AppListenerCallback) {
  appListeners.add(callback);
  return () => {
    appListeners.delete(callback);
  };
}

export function triggerOnCreateApp(app: App) {
  appListeners.forEach((callback) => {
    callback(app);
  });
}
