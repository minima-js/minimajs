import type { App } from "@minimajs/server";
import type { OpenAPI } from "./types.js";
import { cleanJSONSchema } from "./schema-converter.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";
import { kInternal, kOperation } from "./symbols.js";
import { getRoutes } from "./router.js";

type JSONSchema = {
  type?: string;
  title?: string;
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

export function generateOpenAPIDocument(app: App, document: OpenAPI.Document): OpenAPI.Document {
  for (const route of getRoutes(app)) {
    const { method, path, params, store } = route;
    if (store.metadata[kInternal]) continue;

    const openAPIPath = convertPathToOpenAPI(path);
    document.paths![openAPIPath] ??= {};

    const requestSchema = store.metadata[kRequestSchema] as RequestSchema | undefined;
    const responseSchema = store.metadata[kResponseSchema] as ResponseSchema | undefined;
    const operation = buildOperation(document, params, requestSchema, responseSchema);
    Object.assign(operation, store.metadata[kOperation]);
    operation.operationId ??= generateOperationId(method, path);
    (document.paths![openAPIPath] as Record<string, unknown>)[method.toLowerCase()] = operation;
  }

  return document;
}

function convertPathToOpenAPI(path: string): string {
  return path.replace(/:(\w+)/g, "{$1}");
}

function generateOperationId(method: string, path: string): string {
  const parts = path.split("/").filter(Boolean);
  const camelParts = parts.map((part) => {
    const name = part.startsWith(":") ? part.slice(1) : part;
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
  return method.toLowerCase() + camelParts.join("");
}

function resolveSchemaRef(document: OpenAPI.Document, schema: JSONSchema): OpenAPI.SchemaObject | OpenAPI.ReferenceObject {
  const cleaned = cleanJSONSchema(schema);
  if (schema.title) {
    document.components ??= {};
    document.components.schemas ??= {};
    document.components.schemas[schema.title] = cleaned;
    return { $ref: `#/components/schemas/${schema.title}` };
  }
  return cleaned;
}

function buildOperation(
  document: OpenAPI.Document,
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
      required: (requestSchema.body["$meta-body-required"] as boolean) ?? true,
      content: {
        "application/json": {
          schema: resolveSchemaRef(document, requestSchema.body),
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
            schema: resolveSchemaRef(document, response.body),
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
