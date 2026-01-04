import type { RouteMetaDescriptor } from "../interfaces/route.js";
import { getAppRouteDescriptors } from "../internal/route.js";
import { plugin } from "../internal/plugins.js";

export function descriptor<T>(descriptor: RouteMetaDescriptor<T>) {
  return plugin.sync<T>((app) => {
    getAppRouteDescriptors<T>(app.container).push(descriptor);
  });
}
