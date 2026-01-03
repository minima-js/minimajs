import type { App } from "@minimajs/server";
import { plugin } from "@minimajs/server";
import type {
  OpenAPIDocument,
  OpenAPIOperation,
  OpenAPIOptions,
  OpenAPIParameter,
  RouteDocumentation,
} from "./types.js";
import { convertZodToOpenAPI, extractPathParameters } from "./schema-converter.js";
import { kOpenAPIDoc } from "./metadata.js";

export interface OpenAPIPluginOptions extends OpenAPIOptions {
  path?: string;
}

export function openapi(options: OpenAPIPluginOptions) {
  const {
    info,
    servers = [],
    tags = [],
    security,
    components,
    externalDocs,
    path = "/openapi.json",
  } = options;

  return plugin.sync((app) => {
    app.get(path, () => {
      return generateOpenAPIDocument(app, {
        info,
        servers,
        tags,
        security,
        components,
        externalDocs,
      });
    });
  });
}

export function generateOpenAPIDocument(
  app: App,
  options: OpenAPIOptions
): OpenAPIDocument {
  const document: OpenAPIDocument = {
    openapi: "3.1.0",
    info: options.info,
    paths: {},
  };

  if (options.servers && options.servers.length > 0) {
    document.servers = options.servers;
  }

  if (options.tags && options.tags.length > 0) {
    document.tags = options.tags;
  }

  if (options.security) {
    document.security = options.security;
  }

  if (options.components) {
    document.components = options.components;
  }

  if (options.externalDocs) {
    document.externalDocs = options.externalDocs;
  }

  const routes = extractRoutes(app);

  for (const route of routes) {
    const { path, methods, metadata } = route;

    const docs = metadata.get(kOpenAPIDoc);
    const routeDoc = docs ? Array.from(docs)[0] as RouteDocumentation : undefined;

    const pathItem = document.paths[path] || {};

    for (const method of methods) {
      const methodLower = method.toLowerCase();
      const operation = buildOperation(path, routeDoc);
      pathItem[methodLower] = operation;
    }

    document.paths[path] = pathItem;
  }

  return document;
}

function extractRoutes(app: App): Array<{
  path: string;
  methods: string[];
  metadata: Map<symbol, Set<unknown>>;
}> {
  const routes: Array<{
    path: string;
    methods: string[];
    metadata: Map<symbol, Set<unknown>>;
  }> = [];

  const router = app.router;
  const routeMap = new Map<string, {
    methods: Set<string>;
    metadata: Map<symbol, Set<unknown>>;
  }>();

  function collectRoutes(node: any) {
    if (!node) return;

    if (node.store) {
      const { path, methods, metadata } = node.store;
      const openAPIPath = convertPathToOpenAPI(path);

      if (!routeMap.has(openAPIPath)) {
        routeMap.set(openAPIPath, {
          methods: new Set(),
          metadata: metadata || new Map(),
        });
      }

      const route = routeMap.get(openAPIPath)!;
      for (const method of methods) {
        route.methods.add(method);
      }
    }

    if (node.children) {
      for (const child of Object.values(node.children)) {
        collectRoutes(child);
      }
    }
  }

  try {
    collectRoutes((router as any).tree);
  } catch {
    // Fallback: router structure might be different
  }

  for (const [path, { methods, metadata }] of routeMap) {
    routes.push({
      path,
      methods: Array.from(methods),
      metadata,
    });
  }

  return routes;
}

function convertPathToOpenAPI(path: string): string {
  return path.replace(/:(\w+)/g, "{$1}");
}

function buildOperation(
  path: string,
  doc?: RouteDocumentation
): OpenAPIOperation {
  const operation: OpenAPIOperation = {
    responses: {
      "200": {
        description: "Successful response",
      },
    },
  };

  if (doc) {
    if (doc.summary) operation.summary = doc.summary;
    if (doc.description) operation.description = doc.description;
    if (doc.tags) operation.tags = doc.tags;
    if (doc.operationId) operation.operationId = doc.operationId;
    if (doc.deprecated) operation.deprecated = doc.deprecated;
    if (doc.security) operation.security = doc.security;

    const parameters: OpenAPIParameter[] = [];

    const pathParams = extractPathParameters(path);
    parameters.push(...pathParams);

    if (doc.query) {
      const querySchema = convertZodToOpenAPI(doc.query);
      if (querySchema.properties) {
        for (const [name, schema] of Object.entries(querySchema.properties)) {
          parameters.push({
            name,
            in: "query",
            required: querySchema.required?.includes(name) || false,
            schema,
          });
        }
      }
    }

    if (doc.headers) {
      const headerSchema = convertZodToOpenAPI(doc.headers);
      if (headerSchema.properties) {
        for (const [name, schema] of Object.entries(headerSchema.properties)) {
          parameters.push({
            name,
            in: "header",
            required: headerSchema.required?.includes(name) || false,
            schema,
          });
        }
      }
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    if (doc.body) {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: convertZodToOpenAPI(doc.body),
          },
        },
      };
    }

    if (doc.responses) {
      operation.responses = {};
      for (const [status, response] of Object.entries(doc.responses)) {
        operation.responses[status] = {
          description: response.description,
        };

        if (response.schema) {
          operation.responses[status]!.content = {
            "application/json": {
              schema: convertZodToOpenAPI(response.schema),
            },
          };
        }

        if (response.headers) {
          const headerSchema = convertZodToOpenAPI(response.headers);
          if (headerSchema.properties) {
            operation.responses[status]!.headers = {};
            for (const [name, schema] of Object.entries(headerSchema.properties)) {
              operation.responses[status]!.headers![name] = {
                schema,
              };
            }
          }
        }
      }
    }
  } else {
    const pathParams = extractPathParameters(path);
    if (pathParams.length > 0) {
      operation.parameters = pathParams;
    }
  }

  return operation;
}
