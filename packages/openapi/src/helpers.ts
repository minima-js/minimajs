import type { App } from "@minimajs/server";
import { kModuleName, kModulesChain } from "@minimajs/server/symbols";

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getDefaultTags(app: App): string[] {
  const modules = app.container[kModulesChain];
  const start = modules[1]?.container[kModuleName] === "root" ? 2 : 1;
  return [
    modules
      .slice(start)
      .map((x) => capitalize(x.container[kModuleName] as string))
      .join(" "),
  ];
}

export function generateOperationId(method: string, path: string): string {
  function toCamelCase(input: string): string {
    let result = "";
    let upperNext = false;

    for (const ch of input) {
      if (/[a-zA-Z0-9]/.test(ch)) {
        result += upperNext ? ch.toUpperCase() : ch.toLowerCase();
        upperNext = false;
      } else {
        upperNext = result.length > 0;
      }
    }

    return result;
  }

  const normalized = `${method} ${path}`
    .replace(/[{}:]/g, "") // support :id and {id}
    .replace(/\//g, " "); // path boundaries

  return toCamelCase(normalized);
}
