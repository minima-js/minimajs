import { describe, test, expect } from "@jest/globals";
import { extractIpAddress } from "./request.js";
import type { Context } from "../interfaces/context.js";
import type { request } from "../http.js";

describe("internal/request", () => {
  describe("extractIpAddress", () => {
    test("should return null when no IP is found", () => {
      const context = {
        request: { headers: new Headers() },
      } as Context;
      const settings: request.ip.Settings = {};
      expect(extractIpAddress(context, settings)).toBeNull();
    });

    test("should extract IP from custom header", () => {
      const headers = new Headers();
      headers.set("x-custom-ip", "1.2.3.4");
      const context = { request: { headers } } as Context;
      const settings: request.ip.Settings = { header: "x-custom-ip" };
      expect(extractIpAddress(context, settings)).toBe("1.2.3.4");
    });

    test("should extract IP from x-forwarded-for", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "1.2.3.4, 5.6.7.8");
      const context = { request: { headers } } as Context;
      const settings: request.ip.Settings = { trustProxy: true };
      expect(extractIpAddress(context, settings)).toBe("5.6.7.8");
    });

    test("should extract IP from x-forwarded-for with proxyDepth", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "1.2.3.4, 5.6.7.8, 9.10.11.12");
      const context = { request: { headers } } as Context;
      const settings: request.ip.Settings = { trustProxy: true, proxyDepth: 2 };
      expect(extractIpAddress(context, settings)).toBe("5.6.7.8");
    });

    test("should extract IP from x-real-ip", () => {
      const headers = new Headers();
      headers.set("x-real-ip", "1.2.3.4");
      const context = { request: { headers } } as Context;
      const settings: request.ip.Settings = { trustProxy: true };
      expect(extractIpAddress(context, settings)).toBe("1.2.3.4");
    });

    test("should prioritize custom header over proxy headers", () => {
      const headers = new Headers();
      headers.set("x-custom-ip", "1.1.1.1");
      headers.set("x-forwarded-for", "2.2.2.2");
      const context = { request: { headers } } as Context;
      const settings: request.ip.Settings = {
        header: "x-custom-ip",
        trustProxy: true,
      };
      expect(extractIpAddress(context, settings)).toBe("1.1.1.1");
    });

    test("should fallback to socket remoteAddress", () => {
      const context = {
        request: { headers: new Headers() },
        incomingMessage: { socket: { remoteAddress: "127.0.0.1" } },
      } as unknown as Context;
      const settings: request.ip.Settings = {};
      expect(extractIpAddress(context, settings)).toBe("127.0.0.1");
    });
  });
});
