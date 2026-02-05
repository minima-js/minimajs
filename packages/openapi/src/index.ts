import { plugin, type Context } from "@minimajs/server";
import { generateOpenAPIDocument } from "./generator.js";
import { internal } from "./internal.js";
import type { OpenAPI } from "./types.js";

export { generateOpenAPIDocument } from "./generator.js";
export { cleanJSONSchema } from "./schema-converter.js";
export * from "./internal.js";
export { describe } from "./describe.js";
export type { OpenAPI } from "./types.js";

export interface OpenAPIPluginOptions extends Omit<OpenAPI.Document, "info" | "openapi"> {
  path?: string;
  info?: OpenAPI.Document["info"];
}

export * from "./generator.js";

const kOpenAPISpec = Symbol("minimajs.openapi.specs");

export function openapi({ path = "/openapi.json", info, ...baseOptions }: OpenAPIPluginOptions = {}) {
  const document: OpenAPI.Document = {
    ...baseOptions,
    openapi: "3.1.0",
    info: info ?? { title: "Minima.js", version: "1.0.0" },
    paths: {},
  };

  return plugin.sync<any>((app) => {
    app.get(path, internal(), (ctx: Context<any>) => {
      if (!ctx.container[kOpenAPISpec]) {
        ctx.container[kOpenAPISpec] = generateOpenAPIDocument(app, document);
      }
      return ctx.container[kOpenAPISpec];
    });
  });
}
