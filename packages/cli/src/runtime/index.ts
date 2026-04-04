import { join } from "node:path";
import type { Runtime } from "../config/types.js";
import { exists, text } from "../utils/fs.js";

function runtime(): Runtime {
  if (typeof process.versions.bun === "string") return "bun";
  return "node";
}

function detect(): Runtime {
  if (exists(join(process.cwd(), ".bun-version"))) return "bun";
  if (exists(join(process.cwd(), ".node-version"))) return "node";
  return runtime();
}

detect.version = function detectVersion(): string | null {
  const bunFile = join(process.cwd(), ".bun-version");
  if (exists(bunFile)) return text.read(bunFile).trim().replace(/^v/, "");
  const nodeFile = join(process.cwd(), ".node-version");
  if (exists(nodeFile)) return text.read(nodeFile).trim().replace(/^v/, "");
  return null;
};

runtime.version = function version(): string {
  if (typeof process.versions.bun === "string") return process.versions.bun;
  return process.versions.node;
};

runtime.detect = detect;

export { runtime };
