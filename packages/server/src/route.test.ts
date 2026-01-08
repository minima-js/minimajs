import { describe, test, expect } from "@jest/globals";
import { route } from "./route.js";
import { createApp } from "./bun/index.js";
import type { Server } from "./core/index.js";
import { getAppRouteDescriptors } from "./internal/route.js";
import type { RouteMetaDescriptor } from "./interfaces/route.js";

describe("route", () => {
  let app: Server<any>;

  test("meta should add route meta descriptor to the application container", async () => {
    app = createApp({ logger: false });

    const descriptor: RouteMetaDescriptor = [
      Symbol(),
      {
        name: "test",
        description: "test description",
      },
    ];

    const metaPlugin = route.meta(descriptor);
    app.register(metaPlugin);

    const descriptors = getAppRouteDescriptors(app.container);
    expect(descriptors).toContain(descriptor);
  });
});
