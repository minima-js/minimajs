import type { Runtime } from "../config/types.js";
import { exists, text } from "../utils/fs.js";

function runtime(): Runtime {
  if (typeof process.versions.bun === "string") return "bun";
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("bun")) return "bun";
  return "node";
}

function detect(): Runtime {
  if (exists(".bun-version")) return "bun";
  if (exists(".node-version")) return "node";
  return runtime();
}

detect.version = function detectVersion(): string | null {
  const bunFile = ".bun-version";
  if (exists(bunFile)) return text.sync(bunFile).trim().replace(/^v/, "");
  const nodeFile = ".node-version";
  if (exists(nodeFile)) return text.sync(nodeFile).trim().replace(/^v/, "");
  return null;
};

runtime.version = function version(): string {
  if (typeof process.versions.bun === "string") return process.versions.bun;
  return process.versions.node;
};

runtime.detect = detect;

runtime.bin = function bin(rt?: Runtime): string {
  const r = rt ?? runtime();
  const inBun = typeof process.versions.bun === "string";
  if (r === "bun") return inBun ? process.execPath : "bun";
  return inBun ? "node" : process.execPath;
};

runtime.isNode = function isNode(bin: string): boolean {
  const name = (bin.split(/[/\\]/).pop() ?? bin).toLowerCase();
  return name === "node" || name.startsWith("node");
};

export { runtime };
