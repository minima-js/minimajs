import type { App } from "../interfaces/index.js";
import { kIsRoot, kModulesChain, kModuleName } from "../symbols.js";

export function buildModuleName(app: App, handlerName: string | undefined): string {
  const chain: string[] = [];
  for (const a of app.container[kModulesChain].slice(-3)) {
    if (a.container[kIsRoot]) continue;
    const name = a.container[kModuleName] as string | undefined;
    if (name) chain.push(name);
  }
  let name = chain.join("/");
  if (handlerName) name = `${name}:${handlerName}`;
  return name;
}
export function isPrettyEnabled() {
  if (process.env.LOG_FORMAT === "pretty") return true;
  if (process.env.LOG_FORMAT === "json") return false;
  return Boolean(process.stdout.isTTY);
}
