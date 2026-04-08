import { json, text } from "../utils/fs.js";
import { str } from "../utils/index.js";
import { EOL } from "node:os";

export interface Manifest {
  name?: string;
  type?: "module" | "commonjs";
  main?: string;
  scripts?: Record<string, string>;
  packageManager?: string;
  engines?: {
    node?: string;
  };
}

const PKG = "package.json";

/**
 * Writes data to `package.json` in the current working directory.
 * Use `write.sync` for the synchronous variant.
 */
async function write(data: Manifest, indent = 2): Promise<void> {
  await text.write(PKG, JSON.stringify(data, null, indent) + EOL);
}

write.sync = function writeSync(data: Manifest, indent = 2): void {
  text.write.sync(PKG, JSON.stringify(data, null, indent) + EOL);
};

/**
 * Reads and parses `package.json` from the current working directory.
 * Returns an empty object if the file is missing or unreadable.
 *
 * Sub-methods:
 * - `manifest.sync`  — synchronous variant
 * - `manifest.write` — writes data back to `package.json`
 */
export async function manifest(): Promise<Manifest> {
  try {
    const raw = await json<Manifest>(PKG);
    str.ensureCase(raw, "type");
    return raw;
  } catch {
    return {};
  }
}

manifest.sync = function manifestSync(): Manifest {
  try {
    const raw = json.sync<Manifest>(PKG);
    str.ensureCase(raw, "type");
    return raw;
  } catch {
    return {};
  }
};

manifest.write = write;

let CACHED_MANIFEST: Manifest | null = null;
manifest.cached = async function cachedManifest() {
  CACHED_MANIFEST ??= await manifest();
  return CACHED_MANIFEST;
};

/**
 * Converts a Node.js version string into an esbuild-compatible target string.
 * @example getTarget("20.1") // => "node20.1.0"
 */
export function getTarget(node: string, prefix = "node"): string {
  const match = node.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    throw new Error(`Invalid node version: ${node}`);
  }
  const version = `${match[1]}.${match[2] ?? "0"}.${match[3] ?? "0"}`;
  return `${prefix}${version}`;
}
