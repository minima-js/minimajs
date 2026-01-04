import type { RouteMetaDescriptor } from "./interfaces/route.js";
import { plugin } from "./internal/plugins.js";
import { getAppRouteDescriptors } from "./internal/route.js";

export namespace route {
  export function meta<T>(descriptor: RouteMetaDescriptor<T>) {
    return plugin.sync<T>((app) => {
      getAppRouteDescriptors<T>(app.container).push(descriptor);
    });
  }
}
