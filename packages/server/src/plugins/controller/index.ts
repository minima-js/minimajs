import type { HTTPMethod } from "find-my-way";
import type { App, GenericCallback } from "../../interfaces/index.js";
import { plugin } from "../../plugin.js";

type ControllerMethod<K extends string> = `${HTTPMethod} ${string} ${K}`;

export function controller<T extends Record<string, GenericCallback>>(
  methods: Promise<T> | T,
  controllers: ControllerMethod<Extract<keyof T, string>>[]
) {
  return plugin(async (app) => {
    const callbacks = await methods;
    for (const control of controllers) {
      const [method, path, handlerName] = control.split(" ") as [HTTPMethod, string, string];
      if (!method || !path || !handlerName) {
        throw new Error(
          `Invalid controller route definition.
Expected format: "<METHOD> <PATH> <HANDLER_NAME>"
Example: "GET /posts listPosts"`
        );
      }
      const handler = callbacks[handlerName!];
      if (!handler) {
        throw new Error(`Controller handler "${handlerName}" was not found.`);
      }
      app.route({ path, method }, handler);
    }
  });
}

export namespace controller {
  export interface RestHttpMapping {
    path: string;
    method: HTTPMethod;
    name: string;
  }

  export function rest(modules: any, name: string) {
    return plugin(async function (app: App) {
      const mappings: RestHttpMapping[] = [
        { path: "/", method: "GET", name: "list" },
        { path: "/:" + name, method: "GET", name: "find" },
        { path: "/", method: "POST", name: "create" },
        { path: "/:" + name, method: "PATCH", name: "update" },
        { path: "/:" + name, method: "DELETE", name: "remove" },
      ];
      const callbacks = await modules;
      for (const mapping of mappings) {
        const handler = callbacks[mapping.name];
        if (!handler) continue;
        app.route({ path: mapping.path, method: mapping.method }, handler);
      }
    });
  }
}
