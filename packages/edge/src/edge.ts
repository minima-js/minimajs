import { type URL } from "node:url";
import { Edge } from "edge.js";
import { headers } from "@minimajs/server";
import type { EdgeOptions, LoaderTemplate } from "edge.js/types";

export type Template = [path: string, template: LoaderTemplate];
export type Mount = URL | [disk: string, url: URL][];

export interface ViewOptions extends EdgeOptions {
  templates?: Template[];
}

export function createTemplate(name: string, template: string): Template {
  return [name, { template }];
}

export function createView(url: Mount, { templates = [], ...options }: ViewOptions = {}) {
  const edge = Edge.create();
  if (Array.isArray(url)) {
    for (const [disk, loc] of url) {
      edge.mount(disk, loc);
    }
  } else {
    edge.mount(url);
  }
  edge.configure(options);
  for (const [path, tpl] of templates) {
    edge.registerTemplate(path, tpl);
  }
  return function view(templatePath: string, state?: Record<string, any>) {
    headers.set("content-type", "text/html");
    return edge.render(templatePath, state);
  };
}
