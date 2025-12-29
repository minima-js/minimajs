import type { App } from "../interfaces/app.js";
import type { HookStore } from "../interfaces/hooks.js";
import type { Plugin } from "../interfaces/plugin.js";
import { kPluginSync } from "../symbols.js";
import { getHooks } from "./store.js";

export type HookFactory = (hooks: HookStore, app: App) => void;

export function factory(hookFactory: HookFactory) {
  const factoryPlugin: Plugin = (app) => {
    hookFactory(getHooks(app), app);
  };
  factoryPlugin[kPluginSync] = true;
  return factoryPlugin;
}
