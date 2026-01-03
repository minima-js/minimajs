import type { RouteMetaDescriptor } from "@minimajs/server";
import type { RouteDocumentation } from "./types.js";

export const kOpenAPIDoc = Symbol.for("minimajs.openapi.documentation");

export function doc(documentation: RouteDocumentation): RouteMetaDescriptor {
  return [kOpenAPIDoc, documentation];
}
