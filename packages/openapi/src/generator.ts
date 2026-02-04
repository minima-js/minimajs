import type { App, RouteConfig } from "@minimajs/server";
import type { OpenAPI, OpenAPIOptions, RouteDocumentation } from "./types.js";
import type { RequestSchema, ResponseSchema } from "@minimajs/server";
import { extractPathParameters, cleanJSONSchema } from "./schema-converter.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";

interface RouterRoute {
  path: string;
  store?: RouteConfig<unknown>;
}

export function generateOpenAPIDocument(app: App, options: OpenAPIOptions): OpenAPI.Document {
  const document: OpenAPI.Document = {
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

  const pathMap = new Map<
    string,
    {
      methods: Set<string>;
      requestSchema?: RequestSchema;
      responseSchema?: ResponseSchema;
      doc?: RouteDocumentation;
    }
  >();

  // Collect all routes from router
  const routes = (app.router as unknown as { routes: RouterRoute[] }).routes ?? [];
  for (const route of routes) {
    const { path, store } = route;
    if (!store) continue;

    const openAPIPath = convertPathToOpenAPI(path);

    if (!pathMap.has(openAPIPath)) {
      pathMap.set(openAPIPath, {
        methods: new Set(),
        requestSchema: store.metadata[kRequestSchema],
        responseSchema: store.metadata[kResponseSchema],
      });
    }

    const pathEntry = pathMap.get(openAPIPath)!;
    for (const method of store.methods) {
      pathEntry.methods.add(method);
    }
  }

  for (const [path, { methods, requestSchema, responseSchema, doc }] of pathMap) {
    const pathItem: OpenAPI.PathItemObject = document.paths?.[path] || {};

    for (const method of methods) {
      const methodLower = method.toLowerCase() as OpenAPI.HttpMethods;
      const operation = buildOperation(path, requestSchema, responseSchema, doc);
      (pathItem as Record<string, unknown>)[methodLower] = operation;
    }

    document.paths![path] = pathItem;
  }

  return document;
}

function convertPathToOpenAPI(path: string): string {
  return path.replace(/:(\w+)/g, "{$1}");
}

function buildOperation(
  path: string,
  requestSchema?: RequestSchema,
  responseSchema?: ResponseSchema,
  doc?: RouteDocumentation
): OpenAPI.OperationObject {
  const operation: OpenAPI.OperationObject = {
    responses: {
      default: {
        description: "Default response",
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
  }

  const parameters: OpenAPI.ParameterObject[] = [];
  const pathParams = extractPathParameters(path);
  parameters.push(...pathParams);

  if (requestSchema?.headers) {
    if (requestSchema.headers.properties) {
      for (const [name, schema] of Object.entries(requestSchema.headers.properties)) {
        parameters.push({
          name,
          in: "header",
          required: requestSchema.headers.required?.includes(name) || false,
          schema: schema as any,
        });
      }
    }
  }

  if (requestSchema?.searchParams) {
    if (requestSchema.searchParams.properties) {
      for (const [name, schema] of Object.entries(requestSchema.searchParams.properties)) {
        parameters.push({
          name,
          in: "query",
          required: requestSchema.searchParams.required?.includes(name) || false,
          schema: schema as any,
        });
      }
    }
  }

  if (parameters.length > 0) {
    operation.parameters = parameters;
  }

  if (requestSchema?.body) {
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: cleanJSONSchema(requestSchema.body),
        },
      },
    };
  }

  if (responseSchema && Object.keys(responseSchema).length > 0) {
    operation.responses = {};
    for (const [statusCode, response] of Object.entries(responseSchema)) {
      const status = statusCode as string;
      operation.responses[status] = {
        description: `Response for status ${status}`,
      };

      if (response.body) {
        operation.responses[status]!.content = {
          "application/json": {
            schema: cleanJSONSchema(response.body),
          },
        };
      }

      if (response.headers) {
        operation.responses[status]!.headers = {};
        for (const [headerName, headerSchema] of Object.entries(response.headers.properties || {})) {
          operation.responses[status]!.headers![headerName] = {
            schema: headerSchema as any,
          };
        }
      }
    }
  }

  return operation;
}
