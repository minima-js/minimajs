import type { Container } from "../interfaces/app.js";
import type { RouteMetaDescriptor } from "../interfaces/route.js";
import { kAppDescriptor } from "../symbols.js";

export function getDescriptorsAll(container: Container) {
  return container.get(kAppDescriptor) as RouteMetaDescriptor[];
}
