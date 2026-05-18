import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createAuth, bearer, apiKey, fromHeaders } from "./index.js";
import { HttpError } from "@minimajs/server/error";
import { type App } from "@minimajs/server";
import { createApp } from "@minimajs/server/bun";
import { createRequest } from "@minimajs/server/mock";

describe("bearer", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("resolves with extracted token", async () => {
    const [plugin, getUser] = createAuth(bearer((token) => ({ token })));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { authorization: "Bearer abc123" } }));
    expect(await res.json()).toEqual({ token: "abc123" });
  });

  test("is case-insensitive", async () => {
    const [plugin, getUser] = createAuth(bearer((token) => token));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { authorization: "bearer abc123" } }));
    expect(await res.text()).toBe("abc123");
  });

  test("trims whitespace from token", async () => {
    const [plugin, getUser] = createAuth(bearer((token) => token));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { authorization: "Bearer   abc123  " } }));
    expect(await res.text()).toBe("abc123");
  });

  test("throws 401 when Authorization header is missing", async () => {
    const [plugin, getUser] = createAuth(bearer((token) => token));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/"));
    expect(res.status).toBe(401);
  });

  test("throws 401 when scheme is not Bearer", async () => {
    const [plugin, getUser] = createAuth(bearer((token) => token));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { authorization: "Basic dXNlcjpwYXNz" } }));
    expect(res.status).toBe(401);
  });

  test("propagates non-BaseHttpError from callback", async () => {
    const [plugin, getUser] = createAuth(
      bearer(() => {
        throw new Error("db error");
      })
    );
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { authorization: "Bearer abc123" } }));
    expect(res.status).toBe(500);
  });
});

describe("apiKey", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("resolves with value from header", async () => {
    const [plugin, getUser] = createAuth(apiKey("x-api-key", (key) => ({ key })));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-api-key": "secret" } }));
    expect(await res.json()).toEqual({ key: "secret" });
  });

  test("throws 401 when header is missing", async () => {
    const [plugin, getUser] = createAuth(apiKey("x-api-key", (key) => key));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/"));
    expect(res.status).toBe(401);
  });
});

describe("apiKey.query", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("resolves with value from query string", async () => {
    const [plugin, getUser] = createAuth(apiKey.query("api_key", (key) => ({ key })));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { query: { api_key: "secret" } }));
    expect(await res.json()).toEqual({ key: "secret" });
  });

  test("throws 401 when query param is missing", async () => {
    const [plugin, getUser] = createAuth(apiKey.query("api_key", (key) => key));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/"));
    expect(res.status).toBe(401);
  });
});

describe("multi-strategy", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("first strategy wins when it resolves", async () => {
    const [plugin, getUser] = createAuth([bearer((token) => `jwt:${token}`), apiKey("x-api-key", (key) => `key:${key}`)]);
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(
      createRequest("/", {
        headers: { authorization: "Bearer jwt123", "x-api-key": "key123" },
      })
    );
    expect(await res.text()).toBe("jwt:jwt123");
  });

  test("falls through to next strategy when first fails", async () => {
    const [plugin, getUser] = createAuth([bearer((token) => `jwt:${token}`), apiKey("x-api-key", (key) => `key:${key}`)]);
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-api-key": "key123" } }));
    expect(await res.text()).toBe("key:key123");
  });

  test("throws last error when all strategies fail", async () => {
    const [plugin, getUser] = createAuth([
      bearer(() => {
        throw new HttpError("jwt failed", 401);
      }),
      apiKey("x-api-key", () => {
        throw new HttpError("apikey failed", 401);
      }),
    ]);
    app.register(plugin);
    app.get("/", () => getUser.required());

    // send both credentials so both callbacks are actually invoked
    const res = await app.handle(createRequest("/", { headers: { authorization: "Bearer token", "x-api-key": "key" } }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe(JSON.stringify({ message: "apikey failed" }));
  });
});

interface UserHeaders {
  id: string;
  name: string;
}

interface UserPayload {
  id: number;
  name: string;
}

describe("fromHeaders", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("resolves with mapped header values", async () => {
    const [plugin, getUser] = createAuth(fromHeaders<UserHeaders>({ id: "x-user-id", name: "x-user-name" }));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user-id": "42", "x-user-name": "adil" } }));
    expect(await res.json()).toEqual({ id: "42", name: "adil" });
  });

  test("throws 401 when any mapped header is missing", async () => {
    const [plugin, getUser] = createAuth(fromHeaders<UserHeaders>({ id: "x-user-id", name: "x-user-name" }));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user-id": "42" } }));
    expect(res.status).toBe(401);
  });
});

describe("fromHeaders.json", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("parses JSON payload from header", async () => {
    const [plugin, getUser] = createAuth(fromHeaders.json<UserPayload>("x-user"));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user": JSON.stringify({ id: 42, name: "adil" }) } }));
    expect(await res.json()).toEqual({ id: 42, name: "adil" });
  });

  test("throws 401 when header is missing", async () => {
    const [plugin, getUser] = createAuth(fromHeaders.json<UserPayload>("x-user"));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/"));
    expect(res.status).toBe(401);
  });

  test("throws 401 on malformed JSON instead of 500", async () => {
    const [plugin, getUser] = createAuth(fromHeaders.json<UserPayload>("x-user"));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user": "not-valid-json" } }));
    expect(res.status).toBe(401);
  });
});

describe("fromHeaders.encoded", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("decodes payload using provided decoder", async () => {
    const encode = (val: unknown) => Buffer.from(JSON.stringify(val)).toString("base64");
    const [plugin, getUser] = createAuth(
      fromHeaders.encoded<UserPayload>("x-user", (val) => JSON.parse(Buffer.from(val, "base64").toString()))
    );
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user": encode({ id: 42, name: "adil" }) } }));
    expect(await res.json()).toEqual({ id: 42, name: "adil" });
  });

  test("throws 401 when header is missing", async () => {
    const [plugin, getUser] = createAuth(fromHeaders.encoded<UserPayload>("x-user", (val) => JSON.parse(atob(val))));
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/"));
    expect(res.status).toBe(401);
  });

  test("throws 401 when decoder throws instead of 500", async () => {
    const [plugin, getUser] = createAuth(
      fromHeaders.encoded<UserPayload>("x-user", () => {
        throw new Error("decode failed");
      })
    );
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user": "garbage" } }));
    expect(res.status).toBe(401);
  });
});

describe("fromHeaders — multi-strategy", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("falls through from bearer to gateway headers", async () => {
    const [plugin, getUser] = createAuth([bearer((token) => `jwt:${token}`), fromHeaders.json("x-user")]);
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { "x-user": JSON.stringify({ id: 1 }) } }));
    expect(await res.json()).toEqual({ id: 1 });
  });
});

describe("multi-strategy — error propagation", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });
  afterEach(() => app.close());

  test("propagates non-BaseHttpError immediately without trying remaining strategies", async () => {
    let secondCalled = false;
    const [plugin, getUser] = createAuth([
      bearer(() => {
        throw new Error("unexpected");
      }),
      apiKey("x-api-key", (key) => {
        secondCalled = true;
        return key;
      }),
    ]);
    app.register(plugin);
    app.get("/", () => getUser.required());

    const res = await app.handle(createRequest("/", { headers: { authorization: "Bearer token", "x-api-key": "key" } }));
    expect(res.status).toBe(500);
    expect(secondCalled).toBe(false);
  });
});
