import { join } from "node:path";
import { json, text } from "../utils/fs.js";
import { str } from "../utils/index.js";
import { EOL } from "node:os";
import type { WorkdirOption } from "../types.js";

export interface Manifest {
  name?: string;
  type?: "module" | "commonjs";
  main?: string;
  scripts?: Record<string, string>;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    bun?: string;
  };
}

const PKG = "package.json";

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

export namespace manifest {
  export function sync(cwd = process.cwd()): Manifest {
    try {
      const raw = json.sync<Manifest>(join(cwd, PKG));
      str.ensureCase(raw, "type");
      return raw;
    } catch {
      return {};
    }
  }

  /**
   * Writes data to `package.json` in the current working directory.
   * Use `write.sync` for the synchronous variant.
   */
  export async function write(data: Manifest, indent = 2, { cwd = process.cwd() }: WorkdirOption = {}): Promise<void> {
    await text.write(join(cwd, PKG), JSON.stringify(data, null, indent) + EOL);
  }

  export namespace write {
    export function sync(data: Manifest, indent = 2, { cwd = process.cwd() }: WorkdirOption = {}): void {
      text.write.sync(join(cwd, PKG), JSON.stringify(data, null, indent) + EOL);
    }
  }

  export function target(node: string, prefix = "node"): string {
    const match = node.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) {
      throw new Error(`Invalid node version: ${node}`);
    }
    const version = `${match[1]}.${match[2] ?? "0"}.${match[3] ?? "0"}`;
    return `${prefix}${version}`;
  }
}

let CACHED_MANIFEST: Manifest | null = null;
manifest.cached = async function cachedManifest() {
  CACHED_MANIFEST ??= await manifest();
  return CACHED_MANIFEST;
};
