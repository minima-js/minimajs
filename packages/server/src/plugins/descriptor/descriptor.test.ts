import { describe, test, expect, afterEach } from "@jest/globals";
import { createApp } from "../../bun/index.js";
import { descriptor } from "./index.js";
import { kAppDescriptor } from "../../symbols.js";

describe("descriptor plugin", () => {
  let app: ReturnType<typeof createApp>;

  afterEach(async () => {
    await app.close();
  });

  test("pushes tuple descriptors into the container", () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    const key = Symbol("auth");
    app.register(descriptor([key, "required"]));

    expect(app.container[kAppDescriptor]).toContainEqual([key, "required"]);
  });

  test("applies descriptors to routes registered in the same scope", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    const key = Symbol("tag");
    app.register(descriptor([key, "admin"]));
    app.get("/protected", () => "ok");
    await app.ready();

    const route = (app.router as any).routes.find((r: any) => r.path === "/protected");
    expect(route?.store.metadata[key]).toBe("admin");
  });

  test("accepts multiple descriptors at once", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    const k1 = Symbol("k1");
    const k2 = Symbol("k2");
    app.register(descriptor([k1, "v1"], [k2, "v2"]));
    app.get("/test", () => "ok");
    await app.ready();

    const route = (app.router as any).routes.find((r: any) => r.path === "/test");
    expect(route?.store.metadata[k1]).toBe("v1");
    expect(route?.store.metadata[k2]).toBe("v2");
  });
});
