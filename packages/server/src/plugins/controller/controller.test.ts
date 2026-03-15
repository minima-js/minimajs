import { describe, test, expect, afterEach } from "@jest/globals";
import { createApp } from "../../bun/index.js";
import { controller } from "./index.js";

describe("controller", () => {
  let app: ReturnType<typeof createApp>;

  afterEach(async () => {
    await app.close();
  });

  test("registers routes from handler map", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    const handlers = { list: () => "list", create: () => "create" };
    app.register(controller(handlers, ["GET /items list", "POST /items create"]));

    expect(await (await app.handle(new Request("http://localhost/items"))).text()).toBe("list");
    expect((await app.handle(new Request("http://localhost/items", { method: "POST" }))).status).toBe(200);
  });

  test("accepts a promise for the handler map", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    const handlers = Promise.resolve({ get: () => "async" });
    app.register(controller(handlers, ["GET /async get"]));

    expect(await (await app.handle(new Request("http://localhost/async"))).text()).toBe("async");
  });

  test("throws on malformed route definition", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    app.register(controller({}, ["GET /only-two-parts"] as any));

    await expect(app.ready()).rejects.toThrow("Invalid controller route definition");
  });

  test("throws when handler name is not found", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    app.register(controller({ list: () => "ok" }, ["GET /items missing" as any]));

    await expect(app.ready()).rejects.toThrow('Controller handler "missing" was not found');
  });
});

describe("controller.rest", () => {
  let app: ReturnType<typeof createApp>;

  afterEach(async () => {
    await app.close();
  });

  test("registers standard REST routes", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    const handlers = {
      list: () => "list",
      find: () => "find",
      create: () => "create",
      update: () => "update",
      remove: () => "remove",
    };
    app.register(controller.rest(handlers, "id"));

    expect(await (await app.handle(new Request("http://localhost/"))).text()).toBe("list");
    expect(await (await app.handle(new Request("http://localhost/123"))).text()).toBe("find");
    expect((await app.handle(new Request("http://localhost/", { method: "POST" }))).status).toBe(200);
    expect((await app.handle(new Request("http://localhost/123", { method: "PATCH" }))).status).toBe(200);
    expect((await app.handle(new Request("http://localhost/123", { method: "DELETE" }))).status).toBe(200);
  });

  test("skips missing handlers", async () => {
    app = createApp({ logger: false, moduleDiscovery: false });
    app.register(controller.rest({ list: () => "list" }, "id"));
    await app.ready();

    expect(await (await app.handle(new Request("http://localhost/"))).text()).toBe("list");
    expect((await app.handle(new Request("http://localhost/123"))).status).toBe(404);
  });
});
