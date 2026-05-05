import type { Runtime } from "../config/types.js";
import { exists, text } from "../utils/fs.js";
import { manifest } from "../manifest/index.js";
import { exec } from "../utils/exec.js";

export function runtime(): Runtime {
  if (typeof process.versions.bun === "string") return "bun";
  return "node";
}

export namespace runtime {
  export function detect(): Runtime {
    if (exists(".bun-version")) return "bun";
    if (exists(".node-version")) return "node";
    const pkg = manifest.sync.cached();
    if (pkg.engines?.bun) return "bun";
    if (pkg.engines?.node) return "node";
    return runtime();
  }

  export namespace detect {
    export function version(): string | null {
      if (exists(".bun-version")) return text.sync(".bun-version").trim().replace(/^v/, "");
      if (exists(".node-version")) return text.sync(".node-version").trim().replace(/^v/, "");
      const pkg = manifest.sync.cached();
      const engine = pkg.engines?.bun ?? pkg.engines?.node ?? null;
      if (!engine) return null;
      // engines values are semver ranges (e.g. ">=20.0.0", "^1.0.0") — extract the first version number
      const match = engine.match(/(\d+\.\d+(?:\.\d+)?)/);
      return match ? match[1]! : null;
    }
  }

  export function version(): string {
    if (typeof process.versions.bun === "string") return process.versions.bun;
    return process.versions.node;
  }

  export function resolve(name?: Runtime): { name: Runtime; version: string } {
    if (name) {
      const v = exec.capture.sync(name, ["--version"]).stdout.replace(/^v/, "").trim();
      return { name, version: v };
    }

    const agent = process.env.npm_config_user_agent ?? "";

    const bunAgent = agent.match(/^bun\/(\S+)/);
    if (bunAgent?.[1]) return { name: "bun", version: bunAgent[1] };

    const nodeAgent = agent.match(/node\/v(\S+)/);
    if (nodeAgent?.[1]) return { name: "node", version: nodeAgent[1] };

    if (typeof process.versions.bun === "string") return { name: "bun", version: process.versions.bun };
    return { name: "node", version: process.versions.node };
  }

  export function bin(rt?: Runtime): string {
    return rt ?? runtime();
  }

  export function isNode(bin: string): boolean {
    const name = (bin.split(/[/\\]/).pop() ?? bin).toLowerCase();
    return name === "node" || name.startsWith("node");
  }
}
