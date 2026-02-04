import type { Context } from "../../interfaces/index.js";
import type { ProxyOptions } from "./types.js";

interface CompiledCidr {
  version: 4 | 6;
  mask: bigint;
  network: bigint;
}

export function createTrustValidator<S>(trustProxies: ProxyOptions<S>["trustProxies"]): (ctx: Context<S>) => boolean {
  if (!trustProxies) {
    return () => true;
  }
  if (typeof trustProxies === "function") {
    return trustProxies;
  }

  if (Array.isArray(trustProxies)) {
    const evaluate = buildListValidator(trustProxies);
    return (ctx: Context<S>) => {
      const ip = normalizeRemoteAddress(ctx.serverAdapter.remoteAddr(ctx)?.hostname);
      return evaluate(ip);
    };
  }

  const { proxies = [], validator } = trustProxies;
  const evaluate = buildListValidator(proxies);
  return (ctx: Context<S>) => {
    const ip = normalizeRemoteAddress(ctx.serverAdapter.remoteAddr(ctx)?.hostname);
    if (validator && validator(ctx, ip)) {
      return true;
    }
    return evaluate(ip);
  };
}

function buildListValidator(list: string[]) {
  if (!list.length) {
    return () => false;
  }

  const exact = new Set<string>();
  const cidrs: CompiledCidr[] = [];

  for (const entry of list) {
    const trimmed = entry?.trim();
    if (!trimmed) continue;

    if (trimmed.includes("/")) {
      const cidr = compileCidr(trimmed);
      if (cidr) {
        cidrs.push(cidr);
      }
      continue;
    }

    const normalized = normalizeConfigAddress(trimmed);
    if (normalized) {
      exact.add(normalized);
    }
  }

  if (!exact.size && !cidrs.length) {
    return () => false;
  }

  return (ip: string | null) => {
    if (!ip) return false;
    if (exact.has(ip)) {
      return true;
    }

    const parsedIp = parseIp(ip);
    if (!parsedIp) {
      return false;
    }

    for (const cidr of cidrs) {
      if (parsedIp.version !== cidr.version) continue;
      if ((parsedIp.value & cidr.mask) === cidr.network) {
        return true;
      }
    }

    return false;
  };
}

function compileCidr(entry: string): CompiledCidr | null {
  const [base, prefix] = entry.split("/", 2);
  const normalizedBase = normalizeConfigAddress(base);
  if (!normalizedBase) {
    return null;
  }

  const parsed = parseIp(normalizedBase);
  if (!parsed) {
    return null;
  }

  const prefixBits = prefix ? Number(prefix) : parsed.bits;
  if (!Number.isInteger(prefixBits) || prefixBits < 0 || prefixBits > parsed.bits) {
    return null;
  }

  const mask = createPrefixMask(prefixBits, parsed.bits);
  const network = parsed.value & mask;

  return {
    version: parsed.version,
    mask,
    network,
  };
}

function createPrefixMask(bits: number, totalBits: number): bigint {
  if (bits <= 0) {
    return 0n;
  }

  if (bits >= totalBits) {
    return (1n << BigInt(totalBits)) - 1n;
  }

  const leadingOnes = (1n << BigInt(bits)) - 1n;
  return leadingOnes << BigInt(totalBits - bits);
}

interface ParsedIp {
  version: 4 | 6;
  bits: number;
  value: bigint;
}

function parseIp(address: string): ParsedIp | null {
  if (!address) return null;
  if (address.includes(":")) {
    return parseIpv6(address);
  }
  if (address.includes(".")) {
    return parseIpv4(address);
  }
  return null;
}

function parseIpv4(address: string): ParsedIp | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0n;
  for (const part of parts) {
    if (!part) return null;
    if (!/^[0-9]+$/.test(part)) {
      return null;
    }
    const segment = Number(part);
    if (!Number.isInteger(segment) || segment < 0 || segment > 255) {
      return null;
    }
    value = (value << 8n) + BigInt(segment);
  }

  return {
    version: 4,
    bits: 32,
    value,
  };
}

function parseIpv6(address: string): ParsedIp | null {
  const segments = address.split("::");
  if (segments.length > 2) {
    return null;
  }

  const left = segments[0] ? segments[0].split(":") : [];
  const right = segments.length === 2 ? (segments[1] ? segments[1].split(":") : []) : [];
  const leftExpanded = expandIpv6Section(left);
  const rightExpanded = expandIpv6Section(right);

  if (!leftExpanded || !rightExpanded) {
    return null;
  }

  const missing = 8 - (leftExpanded.length + rightExpanded.length);
  if (missing < 0) {
    return null;
  }

  const expanded = [...leftExpanded, ...Array(missing).fill("0"), ...rightExpanded];
  if (expanded.length !== 8) {
    return null;
  }

  let value = 0n;
  for (const segment of expanded) {
    if (!segment) {
      return null;
    }
    const parsed = Number.parseInt(segment, 16);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0xffff) {
      return null;
    }
    value = (value << 16n) + BigInt(parsed);
  }

  return {
    version: 6,
    bits: 128,
    value,
  };
}

function expandIpv6Section(parts: string[]): string[] | null {
  if (!parts.length) {
    return [];
  }

  const result: string[] = [];
  for (const part of parts) {
    if (!part) {
      result.push("0");
      continue;
    }

    if (part.includes(".")) {
      const ipv4 = parseIpv4(part);
      if (!ipv4) {
        return null;
      }
      const high = Number((ipv4.value >> 16n) & 0xffffn).toString(16);
      const low = Number(ipv4.value & 0xffffn).toString(16);
      result.push(high, low);
      continue;
    }

    result.push(part.toLowerCase());
  }

  return result;
}

function normalizeRemoteAddress(ip?: string | null): string | null {
  if (!ip) return null;
  const stripped = stripZone(ip.trim());
  if (!stripped) return null;
  const lower = stripped.toLowerCase();
  if (lower.startsWith("::ffff:") && lower.includes(".")) {
    return lower.slice(7);
  }
  return lower;
}

function normalizeConfigAddress(ip?: string | null): string | null {
  if (!ip) return null;
  let value = stripZone(ip.trim());
  if (!value) return null;
  if (value.startsWith("[")) {
    value = value.endsWith("]") ? value.slice(1, -1) : value;
  }
  const lower = value.toLowerCase();
  if (lower.startsWith("::ffff:") && lower.includes(".")) {
    return lower.slice(7);
  }
  return lower;
}

function stripZone(ip: string): string {
  const zoneIndex = ip.indexOf("%");
  if (zoneIndex === -1) {
    return ip;
  }
  return ip.slice(0, zoneIndex);
}
