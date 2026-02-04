import { plugin } from "@minimajs/server";
import { generateOpenAPIDocument } from "./generator.js";
import { internal } from "./internal.js";
import type { OpenAPIOptions } from "./types.js";

export { generateOpenAPIDocument } from "./generator.js";
export { cleanJSONSchema } from "./schema-converter.js";
export * from "./internal.js";
export { describe } from "./describe.js";
export type { OpenAPI, OpenAPIOptions } from "./types.js";

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
    app.get(path, internal(), () => {
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
