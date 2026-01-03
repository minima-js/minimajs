import { hook, type App, type Context, type PluginSync, type RouteHandler } from "@minimajs/server";
import { kSchema } from "./symbols.js";
import { getSchemaMetadata, type SchemaMetadata } from "./validation.js";

export type SchemaLifecycleTypes = "body" | "headers" | "response" | "searchParams";

interface SchemaStore {
  path: string;
  handler: RouteHandler;
  app: App;
  schemas: SchemaMetadata[];
}

export function configureSchema(): PluginSync {
  async function handleRequest({ route }: Context) {
    if (!route) return;
    const schemaStore = route.metadata.get(kSchema) as Set<SchemaStore> | undefined;
    if (!schemaStore) return;
    for (const store of schemaStore) {
      for (const schema of store.schemas) {
        await schema.callback();
      }
    }
  }
  return hook("request", handleRequest);
}

export function schema<T>(...schemas: CallableFunction[]) {
  return function descriptor(path: string, handler: RouteHandler<T>, app: App) {
    const values: SchemaStore = {
      path,
      handler,
      app,
      schemas: schemas.map((x) => getSchemaMetadata(x)),
    } as SchemaStore;
    return [kSchema, values] as [symbol, unknown];
  };
}
