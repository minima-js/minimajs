import type { App } from "@minimajs/server";
import type { OpenAPI, OpenAPIOptions } from "./types.js";
import { cleanJSONSchema } from "./schema-converter.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";
import { kInternal, kOperation } from "./symbols.js";
import { getRoutes } from "./router.js";

type JSONSchema = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
};

type RequestSchema = {
  body?: JSONSchema;
  headers?: JSONSchema;
  searchParams?: JSONSchema;
  params?: JSONSchema;
};

type ResponseSchema = {
  [statusCode: number]: {
    body?: JSONSchema;
    headers?: JSONSchema;
  };
};

const HTTP_STATUS_DESCRIPTIONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

export function generateOpenAPIDocument(app: App, options: OpenAPIOptions): OpenAPI.Document {
  const document: OpenAPI.Document = {
    openapi: "3.1.0",
    info: options.info!,
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

  for (const route of getRoutes(app)) {
    const { method, path, params, store } = route;
    if (store.metadata[kInternal]) continue;

    const openAPIPath = convertPathToOpenAPI(path);
    document.paths![openAPIPath] ??= {};

    const requestSchema = store.metadata[kRequestSchema] as RequestSchema | undefined;
    const responseSchema = store.metadata[kResponseSchema] as ResponseSchema | undefined;
    const operation = buildOperation(params, requestSchema, responseSchema);
    Object.assign(operation, store.metadata[kOperation]);
    (document.paths![openAPIPath] as Record<string, unknown>)[method.toLowerCase()] = operation;
  }

  return document;
}

function convertPathToOpenAPI(path: string): string {
  return path.replace(/:(\w+)/g, "{$1}");
}

function buildOperation(
  pathParams: string[],
  requestSchema?: RequestSchema,
  responseSchema?: ResponseSchema
): OpenAPI.OperationObject {
  const operation: OpenAPI.OperationObject = {
    responses: {
      default: {
        description: "Default response",
      },
    },
  };

  const parameters: OpenAPI.ParameterObject[] = [];
  // Add path parameters - use schema from createParams() if available
  for (const name of pathParams) {
    const paramSchema = requestSchema?.params?.properties?.[name] ?? { type: "string" };
    parameters.push({
      name,
      in: "path",
      required: true,
      schema: paramSchema as OpenAPI.ReferenceObject,
    });
  }

  if (requestSchema?.headers?.properties) {
    for (const [name, propSchema] of Object.entries(requestSchema.headers.properties)) {
      parameters.push({
        name,
        in: "header",
        required: requestSchema.headers.required?.includes(name) || false,
        schema: propSchema as OpenAPI.ReferenceObject,
      });
    }
  }

  if (requestSchema?.searchParams?.properties) {
    for (const [name, propSchema] of Object.entries(requestSchema.searchParams.properties)) {
      parameters.push({
        name,
        in: "query",
        required: requestSchema.searchParams.required?.includes(name) || false,
        schema: propSchema as OpenAPI.ReferenceObject,
      });
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
      const statusNum = Number(statusCode);
      const description = HTTP_STATUS_DESCRIPTIONS[statusNum] || `Response ${statusCode}`;
      operation.responses[statusCode] = { description };

      if (response.body) {
        operation.responses[statusCode]!.content = {
          "application/json": {
            schema: cleanJSONSchema(response.body),
          },
        };
      }

      if (response.headers?.properties) {
        operation.responses[statusCode]!.headers = {};
        for (const [headerName, headerSchema] of Object.entries(response.headers.properties)) {
          operation.responses[statusCode]!.headers![headerName] = {
            schema: headerSchema,
          } as OpenAPI.HeaderObject;
        }
      }
    }
  }

  return operation;
}
