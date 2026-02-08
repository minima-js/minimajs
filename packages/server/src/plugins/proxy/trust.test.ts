import { describe, test, expect } from "@jest/globals";
import { createTrustValidator } from "./trust.js";
import type { Context } from "../../interfaces/index.js";
import { mockContext } from "../../mock/context.js";

describe("trust", () => {
  function mockCtx(remoteAddr?: string | null): Context<unknown> {
    const ctx = mockContext((ctx) => {
      return {
        ...ctx,
        serverAdapter: { remoteAddr: () => (remoteAddr ? { hostname: remoteAddr } : null) },
      } as unknown as Context<unknown>;
    });
    return ctx;
  }

  describe("createTrustValidator", () => {
    test("should return true when trustProxies is undefined", () => {
      const validator = createTrustValidator(undefined);
      expect(validator(mockCtx("1.2.3.4"))).toBe(true);
    });

    test("should return function when trustProxies is function", () => {
      const validator = createTrustValidator((ctx) => ctx.serverAdapter.remoteAddr(ctx)?.hostname === "1.2.3.4");
      expect(validator(mockCtx("1.2.3.4"))).toBe(true);
      expect(validator(mockCtx("5.6.7.8"))).toBe(false);
    });

    test("should validate array of IPs", () => {
      const validator = createTrustValidator(["127.0.0.1", "10.0.0.1"]);
      expect(validator(mockCtx("127.0.0.1"))).toBe(true);
      expect(validator(mockCtx("10.0.0.1"))).toBe(true);
      expect(validator(mockCtx("192.168.1.1"))).toBe(false);
    });

    test("should validate CIDR ranges", () => {
      const validator = createTrustValidator(["192.168.0.0/16", "10.0.0.0/8"]);
      expect(validator(mockCtx("192.168.1.1"))).toBe(true);
      expect(validator(mockCtx("10.5.5.5"))).toBe(true);
      expect(validator(mockCtx("172.16.0.1"))).toBe(false);
    });

    test("should validate IPv6 addresses", () => {
      const validator = createTrustValidator(["::1", "2001:db8::/32"]);
      expect(validator(mockCtx("::1"))).toBe(true);
      expect(validator(mockCtx("2001:db8::1"))).toBe(true);
      expect(validator(mockCtx("2001:db9::1"))).toBe(false);
    });

    test("should handle object with proxies array", () => {
      const validator = createTrustValidator({ proxies: ["127.0.0.1"] });
      expect(validator(mockCtx("127.0.0.1"))).toBe(true);
      expect(validator(mockCtx("192.168.1.1"))).toBe(false);
    });

    test("should handle object with validator function", () => {
      const validator = createTrustValidator({
        proxies: ["127.0.0.1"],
        validator: (ctx) => ctx.serverAdapter.remoteAddr(ctx)?.hostname === "10.0.0.1",
      });

      expect(validator(mockCtx("10.0.0.1"))).toBe(true); // validator takes precedence
      expect(validator(mockCtx("127.0.0.1"))).toBe(true); // falls back to proxies
      expect(validator(mockCtx("192.168.1.1"))).toBe(false);
    });

    test("should handle empty array", () => {
      const validator = createTrustValidator([]);
      expect(validator(mockCtx("127.0.0.1"))).toBe(false);
    });

    test("should handle null/undefined remote address", () => {
      const validator = createTrustValidator(["127.0.0.1"]);
      expect(validator(mockCtx(null))).toBe(false);
      expect(validator(mockCtx(undefined))).toBe(false);
    });

    test("should normalize IPv4-mapped IPv6 addresses", () => {
      const validator = createTrustValidator(["127.0.0.1"]);
      expect(validator(mockCtx("::ffff:127.0.0.1"))).toBe(true);
    });

    test("should handle zone identifiers in IPv6", () => {
      const validator = createTrustValidator(["2001:db8::1"]);
      expect(validator(mockCtx("2001:db8::1%eth0"))).toBe(true);
    });

    test("should handle bracketed IPv6 addresses in config", () => {
      const validator = createTrustValidator(["[2001:db8::1]"]);
      expect(validator(mockCtx("2001:db8::1"))).toBe(true);
    });

    test("should handle mixed exact and CIDR entries", () => {
      const validator = createTrustValidator(["127.0.0.1", "192.168.0.0/16"]);
      expect(validator(mockCtx("127.0.0.1"))).toBe(true);
      expect(validator(mockCtx("192.168.1.1"))).toBe(true);
      expect(validator(mockCtx("192.167.1.1"))).toBe(false);
    });

    test("should skip empty/whitespace entries", () => {
      const validator = createTrustValidator(["127.0.0.1", "  ", "", "10.0.0.1"]);
      expect(validator(mockCtx("127.0.0.1"))).toBe(true);
      expect(validator(mockCtx("10.0.0.1"))).toBe(true);
    });

    test("should handle invalid CIDR gracefully", () => {
      const validator = createTrustValidator(["127.0.0.1", "invalid/cidr", "10.0.0.1"]);
      expect(validator(mockCtx("127.0.0.1"))).toBe(true);
      expect(validator(mockCtx("10.0.0.1"))).toBe(true);
    });

    test("should handle CIDR with different prefix lengths", () => {
      const validator = createTrustValidator(["192.168.1.0/24", "10.0.0.0/16"]);
      expect(validator(mockCtx("192.168.1.100"))).toBe(true);
      expect(validator(mockCtx("10.0.5.5"))).toBe(true);
      expect(validator(mockCtx("192.168.2.1"))).toBe(false);
    });
  });
});
