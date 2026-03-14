import { EOL } from "node:os";
import { type App } from "../../interfaces/index.js";
import type { RouteConfig } from "../../interfaces/route.js";
import { kModuleName, kModulesChain } from "../../symbols.js";

type ModuleNode = {
  name: string;
  routes: Map<string, string[]>; // path → methods
  children: ModuleNode[];
};

function renderEntries(routes: Map<string, string[]>, children: ModuleNode[], indent: string): string[] {
  type Item = { type: "route"; path: string; methods: string[] } | { type: "module"; node: ModuleNode };
  const items: Item[] = [
    ...Array.from(routes.entries()).map(([path, methods]) => ({ type: "route" as const, path, methods })),
    ...children.map((node) => ({ type: "module" as const, node })),
  ];

  const lines: string[] = [];
  for (const [i, item] of items.entries()) {
    const isLast = i === items.length - 1;
    const connector = isLast ? "└──" : "├──";
    const childIndent = indent + (isLast ? "    " : "│   ");

    if (item.type === "route") {
      lines.push(`${indent}${connector} ${item.methods.join(",")} ${item.path}`);
    } else {
      lines.push(`${indent}${connector} ${item.node.name}`);
      lines.push(...renderEntries(item.node.routes, item.node.children, childIndent));
    }
  }
  return lines;
}

/**
 * Returns a formatted string grouping routes by module, with nested modules
 * shown as children and same-path routes merged by method.
 *
 * @example
 * ```
 * (server)
 * ├── GET /health
 * └── users
 *     ├── GET, POST /users
 *     └── GET /users/:id
 * ```
 */
export function prettyPrintByModule(app: App): string {
  const rawRoutes = (app.router as any).routes as Array<{
    method: string;
    path: string;
    store: RouteConfig<any>;
  }>;

  if (!rawRoutes.length) return "";

  const appNodeMap = new WeakMap<App, ModuleNode>();

  function getNode(a: App): ModuleNode {
    if (!appNodeMap.has(a)) {
      const name = (a.container[kModuleName] as string | undefined) ?? "(server)";
      appNodeMap.set(a, { name, routes: new Map(), children: [] });
    }
    return appNodeMap.get(a)!;
  }

  for (const { method, path, store } of rawRoutes) {
    const chain = store.app.container[kModulesChain] as App[];

    // Establish parent → child links in insertion order
    for (let i = 1; i < chain.length; i++) {
      const parentNode = getNode(chain[i - 1]!);
      const childNode = getNode(chain[i]!);
      if (!parentNode.children.includes(childNode)) {
        parentNode.children.push(childNode);
      }
    }

    // Merge methods for same path under the owning module
    const ownerNode = getNode(chain[chain.length - 1]!);
    const methods = ownerNode.routes.get(path) ?? [];
    if (!methods.includes(method)) methods.push(method);
    ownerNode.routes.set(path, methods);
  }

  const rootApp = rawRoutes[0]!.store.app.container[kModulesChain][0] as App;
  const rootNode = getNode(rootApp);

  return [rootNode.name, ...renderEntries(rootNode.routes, rootNode.children, "")].join(EOL);
}
