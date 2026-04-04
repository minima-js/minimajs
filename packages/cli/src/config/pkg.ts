import { join } from "node:path";
import { json } from "../utils/fs.js";
import { ensureCase } from "../utils/index.js";

export interface PkgInfo {
  name?: string;
  type?: "module" | "commonjs";
  main?: string;
  engines?: {
    node?: string;
  };
}

export function loadPkg(): PkgInfo {
  try {
    const cwd = process.cwd();
    const packagePath = join(cwd, "package.json");
    const raw = json.sync<Record<string, unknown>>(packagePath);
    ensureCase(raw, "type");
    return raw as PkgInfo;
  } catch {
    return {};
  }
}

export function getTarget(node: string, prefix = "node"): string {
  // Extract first major.minor.patch triplet from a version range like ">=18.0.0" or "18"
  const match = node.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    throw new Error(`Invalid node version: ${node}`);
  }
  const version = `${match[1]}.${match[2] ?? "0"}.${match[3] ?? "0"}`;
  return `${prefix}${version}`;
}
