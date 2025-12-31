import { z } from "zod";
import { hook, type Context, type PluginSync, type RouteMetadata, type RouteMetaDescriptor } from "@minimajs/server";
import { kSchema } from "./symbols.js";

type SchemaLifecycleTypes = "body" | "header" | "response" | "searchParams";

type SchemaStore = [type: SchemaLifecycleTypes, schema: z.ZodAny][];

function createRouteMetadataDescriptor(fn: any) {
  const symbol = Symbol("schema.infor");
  function getDescriptor(): RouteMetaDescriptor {
    return;
  }

  function getValue(metadata: RouteMetadata) {
    return metadata.get(symbol);
  }

  return [getDescriptor, getValue] as const;
}

export function configureSchema(): PluginSync {
  function handleRequest({ route }: Context) {
    if (!route) return;
    const schema = route.metadata.get(kSchema);
  }
  return hook("request", handleRequest);
}

export function schema(...schemas): RouteMetaDescriptor {
  return function descriptor(path, handler, app) {
    return [kSchema, ""];
  };
}
