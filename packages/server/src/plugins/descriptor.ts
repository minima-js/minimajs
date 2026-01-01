import type { RouteMetaDescriptor } from "../interfaces/route.js";
import { getDescriptorsAll } from "../internal/descriptor.js";
import { plugin } from "../internal/plugins.js";

export function descriptor(descriptor: RouteMetaDescriptor) {
  return plugin.sync((app) => {
    getDescriptorsAll(app.container).push(descriptor);
  });
}
