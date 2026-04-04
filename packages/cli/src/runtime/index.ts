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

export { runtime };
