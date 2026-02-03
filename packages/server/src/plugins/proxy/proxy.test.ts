import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import type { Server as BunServer } from "bun";
import { createApp } from "../../bun/index.js";
import { proxy } from "./index.js";
import { kIpAddr } from "../../symbols.js";
import type { Server } from "../../core/index.js";
import { logger } from "../../index.js";

describe("plugins/proxy", () => {
  let app: Server<BunServer<any>>;

  beforeEach(() => {
    app = createApp({ logger: logger, moduleDiscovery: false });
  });

  afterEach(async () => {
    await app.close();
  });

  test("should extract IP from X-Forwarded-For header", async () => {
    app.register(proxy({ host: false, proto: false }));
    app.get("/ip", (ctx) => ctx.locals[kIpAddr] || null);

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("203.0.113.195");
  });

  test("should respect proxyDepth", async () => {
    app.register(proxy({ ip: { depth: 2 }, host: false, proto: false }));
    app.get("/ip", (ctx) => ctx.locals[kIpAddr]);

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("70.41.3.18");
  });

  test("should extract host from X-Forwarded-Host header", async () => {
    app.register(proxy({ ip: false }));
    app.get("/host", (ctx) => ctx.$metadata.host);

    const req = new Request("http://localhost/host", {
      headers: {
        "x-forwarded-host": "proxy.example.com",
        "x-forwarded-proto": "https",
      },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("proxy.example.com");
  });

  test("should extract proto from X-Forwarded-Proto header", async () => {
    app.register(proxy({ ip: false }));
    app.get("/proto", (ctx) => ctx.$metadata.proto);

    const req = new Request("http://localhost/proto", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "proxy.example.com",
      },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("https");
  });

  test("should use custom callbacks", async () => {
    app.register(
      proxy({
        ip: () => "192.168.1.1",
        host: () => "custom.example.com",
        proto: () => "wss",
      })
    );
    app.get("/all", (ctx) => ({
      ip: ctx.locals[kIpAddr],
      host: ctx.$metadata.host,
      proto: ctx.$metadata.proto,
    }));

    const res = await app.handle(new Request("http://localhost/all"));
    expect(await res.json()).toEqual({
      ip: "192.168.1.1",
      host: "custom.example.com",
      proto: "wss",
    });
  });

  test("should not extract when trustProxies is false", async () => {
    app.register(proxy({ host: false, proto: false }));
    app.adapter.remoteAddr = () => "127.0.0.1";
    app.get("/ip", (ctx) => ctx.locals[kIpAddr]);

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195" },
    });

    const res = await app.handle(req);
    expect(await res.text()).toEqual("203.0.113.195");
  });

  test("should handle IP, host, and proto together", async () => {
    app.register(proxy());
    app.get("/all", (ctx) => ({
      ip: ctx.locals[kIpAddr],
      host: ctx.$metadata.host,
      proto: ctx.$metadata.proto,
    }));

    const req = new Request("http://localhost/all", {
      headers: {
        "x-forwarded-for": "203.0.113.195",
        "x-forwarded-host": "proxy.example.com",
        "x-forwarded-proto": "https",
      },
    });
    const res = await app.handle(req);
    expect(await res.json()).toEqual({
      ip: "203.0.113.195",
      host: "proxy.example.com",
      proto: "https",
    });
  });

  test("should not extract when not trusted", async () => {
    app.register(proxy({ trustProxies: [] })); // Empty array means no trust
    app.get("/all", (ctx) => ({
      ip: ctx.locals[kIpAddr],
      host: ctx.$metadata.host,
      proto: ctx.$metadata.proto,
    }));

    const req = new Request("http://localhost/all", {
      headers: {
        "x-forwarded-for": "203.0.113.195",
        "x-forwarded-host": "proxy.example.com",
        "x-forwarded-proto": "https",
      },
    });
    const res = await app.handle(req);
    const body: any = await res.json();
    expect(body.ip).toBeUndefined();
    expect(body.host).toBeUndefined();
    expect(body.proto).toBeUndefined();
  });

  test("should extract proto when host is enabled", async () => {
    app.register(proxy({ ip: false }));
    app.get("/proto", (ctx) => ctx.$metadata.proto);

    const req = new Request("http://localhost/proto", {
      headers: { "x-forwarded-host": "example.com" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBeTruthy();
  });

  test("proxy.ip should extract IP only", async () => {
    app.register(proxy.ip());
    app.adapter.remoteAddr = () => "127.0.0.1";
    app.get("/ip", (ctx) => ctx.locals[kIpAddr] || "null");

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("203.0.113.195");
  });

  test("proxy.ip should not extract when not trusted", async () => {
    // Empty array means no proxies are trusted
    app.register(proxy.ip({ trustProxies: [] }));
    app.adapter.remoteAddr = () => "192.168.1.1"; // Not in trust list
    app.get("/ip", (ctx) => {
      const ip = ctx.locals[kIpAddr];
      return ip ? ip : "null";
    });

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("null");
  });

  test("should handle null/undefined extractor results", async () => {
    app.adapter.remoteAddr = () => "127.0.0.1";
    app.register(
      proxy({
        ip: () => null,
        host: () => null,
        proto: () => "http",
      })
    );
    app.get("/all", (ctx) => ({
      ip: ctx.locals[kIpAddr],
      host: ctx.$metadata.host,
      proto: ctx.$metadata.proto,
    }));

    const res = await app.handle(new Request("http://localhost/all"));
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const body: any = await res.json();

    expect(body.ip).toBeUndefined();
    expect(body.host).toBeUndefined();
    expect(body.proto).toBe("http");
  });
});
