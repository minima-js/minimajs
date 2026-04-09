import type { Runtime } from "../config/types.js";
import { exists, text } from "../utils/fs.js";
import { manifest } from "../config/pkg.js";

function runtime(): Runtime {
  if (typeof process.versions.bun === "string") return "bun";
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("bun")) return "bun";
  return "node";
}

function detect(): Runtime {
  if (exists(".bun-version")) return "bun";
  if (exists(".node-version")) return "node";
  const pkg = manifest.sync();
  if (pkg.engines?.bun) return "bun";
  if (pkg.engines?.node) return "node";
  return runtime();
}

detect.version = function detectVersion(): string | null {
  if (exists(".bun-version")) return text.sync(".bun-version").trim().replace(/^v/, "");
  if (exists(".node-version")) return text.sync(".node-version").trim().replace(/^v/, "");
  const pkg = manifest.sync();
  const engine = pkg.engines?.bun ?? pkg.engines?.node ?? null;
  if (!engine) return null;
  // engines values are semver ranges (e.g. ">=20.0.0", "^1.0.0") — extract the first version number
  const match = engine.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1]! : null;
};

runtime.version = function version(): string {
  if (typeof process.versions.bun === "string") return process.versions.bun;
  return process.versions.node;
};

runtime.detect = detect;

runtime.bin = function bin(rt?: Runtime): string {
  return rt ?? runtime();
};

runtime.isNode = function isNode(bin: string): boolean {
  const name = (bin.split(/[/\\]/).pop() ?? bin).toLowerCase();
  return name === "node" || name.startsWith("node");
};

export { runtime };
