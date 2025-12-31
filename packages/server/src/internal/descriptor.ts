import type { Container, RouteMetaDescriptor } from "../interfaces/app.js";
import { kAppDescriptor } from "../symbols.js";

export function getDescriptorsAll(container: Container) {
  return container.get(kAppDescriptor) as RouteMetaDescriptor[];
}

// export function getDescriptors<T>(container: Container, name: symbol): Set<T> {
//   const descriptor = container.get(kAppDescriptor) as AppDescriptor<T>;
//   if (!descriptor.has(name)) {
//     descriptor.set(name, new Set());
//   }
//   return descriptor.get(name)!;
// }
