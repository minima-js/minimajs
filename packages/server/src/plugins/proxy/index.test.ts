import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "../../bun/index.js";
import { proxy } from "./index.js";
import { kIpAddr } from "../../symbols.js";
import type { App } from "../../interfaces/app.js";

describe("plugins/proxy", () => {
  let app: App;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("should extract IP from X-Forwarded-For header", async () => {
    app.register(proxy({ trustProxies: true, host: false, proto: false }));
    app.get("/ip", (ctx) => ctx.locals[kIpAddr] || null);

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("203.0.113.195");
  });

  test("should respect proxyDepth", async () => {
    app.register(proxy({ trustProxies: true, ip: { proxyDepth: 2 }, host: false, proto: false }));
    app.get("/ip", (ctx) => ctx.locals[kIpAddr]);

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("70.41.3.18");
  });

  test("should extract host from X-Forwarded-Host header", async () => {
    app.register(proxy({ trustProxies: true, ip: false }));
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

  test("should strip port when stripPort is true", async () => {
    app.register(proxy({ trustProxies: true, host: { stripPort: true }, ip: false }));
    app.get("/host", (ctx) => ctx.$metadata.host);

    const req = new Request("http://localhost/host", {
      headers: {
        "x-forwarded-host": "proxy.example.com:8080",
        "x-forwarded-proto": "https",
      },
    });
    const res = await app.handle(req);
    expect(await res.text()).toBe("proxy.example.com");
  });

  test("should extract proto from X-Forwarded-Proto header", async () => {
    app.register(proxy({ trustProxies: true, ip: false }));
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
        trustProxies: true,
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
    app.register(proxy({ trustProxies: false, host: false, proto: false }));
    app.get("/ip", (ctx) => ctx.locals[kIpAddr] || "none");

    const req = new Request("http://localhost/ip", {
      headers: { "x-forwarded-for": "203.0.113.195" },
    });

    const res = await app.handle(req);
    expect(await res.text()).toBe("none");
  });

  test("should handle IP, host, and proto together", async () => {
    app.register(proxy({ trustProxies: true }));
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
});
