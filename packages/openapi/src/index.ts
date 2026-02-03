import { plugin } from "@minimajs/server";
import { generateOpenAPIDocument } from "./generator.js";
import type { OpenAPIOptions } from "./types.js";

export { generateOpenAPIDocument } from "./generator.js";
export { extractPathParameters, cleanJSONSchema } from "./schema-converter.js";
export type {
  OpenAPIInfo,
  OpenAPIServer,
  OpenAPITag,
  OpenAPIComponents,
  OpenAPISecurityScheme,
  OpenAPIDocument,
  OpenAPIPath,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  RouteDocumentation,
  OpenAPIOptions,
} from "./types.js";

export interface OpenAPIPluginOptions extends OpenAPIOptions {
  path?: string;
}

export * from "./generator.js";

export function openapi(
  options: OpenAPIPluginOptions = {
    info: {
      title: "Minima.js",
      version: "1.0.0",
    },
  }
) {
  const { info, servers = [], tags = [], security, components, externalDocs, path = "/openapi.json" } = options;
  return plugin.sync((app) => {
    app.$root.get(path, () => {
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
