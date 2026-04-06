import { join } from "node:path";
import { json, text } from "../utils/fs.js";
import { str } from "../utils/index.js";

export interface PkgInfo {
  name?: string;
  type?: "module" | "commonjs";
  main?: string;
  scripts?: Record<string, string>;
  engines?: {
    node?: string;
  };
}

const PKG = "package.json";

async function write(data: PkgInfo): Promise<void> {
  await text.write(PKG, JSON.stringify(data, null, 2) + "\n");
}

write.sync = function writeSync(data: PkgInfo): void {
  text.write.sync(PKG, JSON.stringify(data, null, 2) + "\n");
};

export async function pkg(): Promise<PkgInfo> {
  try {
    const raw = await json<PkgInfo>(PKG);
    str.ensureCase(raw, "type");
    return raw;
  } catch {
    return {};
  }
}

pkg.sync = function pkgSync(): PkgInfo {
  try {
    const raw = json.sync<PkgInfo>(join(process.cwd(), PKG));
    str.ensureCase(raw, "type");
    return raw;
  } catch {
    return {};
  }
};

pkg.write = write;

export function getTarget(node: string, prefix = "node"): string {
  const match = node.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    throw new Error(`Invalid node version: ${node}`);
  }
  const version = `${match[1]}.${match[2] ?? "0"}.${match[3] ?? "0"}`;
  return `${prefix}${version}`;
}
