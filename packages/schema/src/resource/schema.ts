import {
  hook,
  type App,
  type Context,
  type PluginSync,
  type RouteHandler,
  type RouteMetaDescriptor,
  type RouteMetadata,
} from "@minimajs/server";
import { kBodySkip } from "@minimajs/server/symbols";
import { kSchema } from "./symbols.js";
import { getSchemaMetadata, type SchemaMetadata } from "./validation.js";

export type SchemaDataTypes = "body" | "headers" | "response" | "searchParams" | "params";

interface SchemaStore<T> {
  path: string;
  handler: RouteHandler<T>;
  app: App;
  schemas: SchemaMetadata[];
}

/**
 * Helper to add value to a Set-based metadata entry
 */
function addSchemaToMetadataSet<T>(metadata: RouteMetadata, value: T): void {
  if (!metadata.has(kSchema)) {
    metadata.set(kSchema, new Set<T>());
  }
  (metadata.get(kSchema) as Set<T>).add(value);
}

export function configureSchema(): PluginSync {
  async function handleRequest(ctx: Context) {
    const { route } = ctx;
    if (!route) return;
    const schemaStore = route.metadata.get(kSchema) as Set<SchemaStore<any>> | undefined;
    if (!schemaStore) return;
    for (const store of schemaStore) {
      for (const schema of store.schemas) {
        await schema.callback(ctx);
      }
    }
  }
  return hook("request", handleRequest);
}

export function schema<T>(...schemas: CallableFunction[]): RouteMetaDescriptor<T> {
  return function descriptor(config) {
    const { metadata } = config;
    const values: SchemaStore<T> = {
      path: config.path,
      handler: config.handler,
      app: config.app,
      schemas: schemas.map((x) => getSchemaMetadata(x)),
    };
    metadata.set(kBodySkip, true);
    addSchemaToMetadataSet(metadata, values);
  };
}
