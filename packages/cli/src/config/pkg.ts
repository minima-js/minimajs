import { join } from "node:path";
import { loadJSON } from "../utils/fs.js";
import { ensureCase } from "../utils/index.js";
import semver from "semver";

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
    const raw = loadJSON<Record<string, unknown>>(packagePath);
    ensureCase(raw, "type");
    return raw as PkgInfo;
  } catch {
    return {};
  }
}

export function getTarget(node: string, prefix = "node"): string {
  const version = semver.coerce(node);
  if (!version) {
    throw new Error(`Invalid node version selected (${node})`);
  }
  return `${prefix}${version.version}`;
}
