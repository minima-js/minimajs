import { describe, expect, test } from "@jest/globals";
import { BunServerAdapter } from "./server.js";

describe("BunServerAdapter", () => {
  test("remoteAddr returns address or null", () => {
    const adapter = new BunServerAdapter();

    const ctxWithIp = {
      server: { requestIP: () => ({ address: "1.2.3.4" }) },
      request: new Request("http://localhost"),
    } as any;

    const ctxWithoutIp = {
      server: { requestIP: () => null },
      request: new Request("http://localhost"),
    } as any;

    expect(adapter.remoteAddr(ctxWithIp)).toBe("1.2.3.4");
    expect(adapter.remoteAddr(ctxWithoutIp)).toBeNull();
  });

  test("listen uses default host and env-based development flag", async () => {
    const originalServe = Bun.serve;
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const fakeServer = {
      hostname: "0.0.0.0",
      port: 8080,
      protocol: "http",
      url: new URL("http://0.0.0.0:8080/"),
      address: { family: "IPv4" },
      stop: async () => {},
    };

    let captured: any;
    (Bun as any).serve = (opts: any) => {
      captured = opts;
      return fakeServer as any;
    };

    try {
      const adapter = new BunServerAdapter();
      const handler = async (_srv: any, _req: Request, partial: any) => {
        expect(partial).toEqual({});
        return new Response("ok");
      };

      const result = await adapter.listen({} as any, { port: 8080 }, handler);

      expect(captured.hostname).toBe("0.0.0.0");
      expect(captured.port).toBe(8080);
      expect(captured.development).toBe(false);

      const res = await captured.fetch(new Request("http://test"));
      expect(await res.text()).toBe("ok");

      expect(result.server).toBe(fakeServer);
      expect(result.address).toEqual({
        hostname: "0.0.0.0",
        port: 8080,
        family: "IPv4",
        protocol: "http",
        address: "http://0.0.0.0:8080/",
      });
    } finally {
      (Bun as any).serve = originalServe;
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("listen respects custom host and explicit development option", async () => {
    const originalServe = Bun.serve;

    const fakeServer = {
      hostname: "127.0.0.1",
      port: 3001,
      protocol: "http",
      url: new URL("http://127.0.0.1:3001/"),
      address: { family: "IPv4" },
      stop: async () => {},
    };

    let captured: any;
    (Bun as any).serve = (opts: any) => {
      captured = opts;
      return fakeServer as any;
    };

    try {
      const adapter = new BunServerAdapter({ development: true });
      const handler = async () => new Response("ok");

      await adapter.listen({} as any, { host: "127.0.0.1", port: 3001 }, handler);

      expect(captured.hostname).toBe("127.0.0.1");
      expect(captured.development).toBe(true);
    } finally {
      (Bun as any).serve = originalServe;
    }
  });

  test("close calls stop", async () => {
    const adapter = new BunServerAdapter();
    let stopped = false;

    await adapter.close({
      stop: async () => {
        stopped = true;
      },
    } as any);

    expect(stopped).toBe(true);
  });
});
