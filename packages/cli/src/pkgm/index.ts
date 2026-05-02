import { join } from "node:path";
import { exec } from "../utils/exec.js";
import { exists } from "../utils/fs.js";
import { manifest } from "../manifest/index.js";
import { logger } from "#/utils/logger.js";

export type PM = "bun" | "pnpm" | "yarn" | "npm";

export interface PMOptions {
  cwd?: string;
  corepack?: boolean;
}

const LOCKFILES: [string, PM][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

function fromUserAgent(): PM | null {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("npm")) return "npm";
  return null;
}

export interface UserAgentInfo {
  manager: PM;
  version: string;
}

export function pkgm(cwd = process.cwd()): PM {
  try {
    const pkg = manifest.sync(cwd);
    if (pkg.packageManager) {
      const name = pkg.packageManager.split("@")[0] as PM;
      if (["bun", "pnpm", "yarn", "npm"].includes(name)) return name;
    }
  } catch {
    // pass
  }

  const agent = fromUserAgent();
  if (agent) return agent;

  for (const [file, detected] of LOCKFILES) {
    if (exists(join(cwd, file))) return detected;
  }

  return "npm";
}

export namespace pkgm {
  export const EXEC: Record<Exclude<PM, "bun">, string> = {
    npm: "npx --no minimajs",
    pnpm: "pnpm exec minimajs",
    yarn: "yarn minimajs",
  };

  export const VALID: readonly PM[] = ["bun", "pnpm", "yarn", "npm"];

  export function isValid(manager: string): manager is PM {
    return (VALID as readonly string[]).includes(manager);
  }

  export function userAgent(): UserAgentInfo | null {
    const agent = process.env.npm_config_user_agent ?? "";
    const match = agent.match(/^(bun|pnpm|yarn|npm)\/([^\s]+)/);
    if (!match || !match[2]) return null;
    return { manager: match[1] as PM, version: match[2] };
  }

  export function isYarnBerry(cwd = process.cwd()): boolean {
    try {
      const { stdout } = exec.capture.sync("yarn", ["--version"], { cwd });
      const major = parseInt(stdout.replace(/^v/, ""), 10);
      return major >= 2;
    } catch {
      return false;
    }
  }

  export function version(manager: PM): string {
    try {
      const result = exec.capture.sync(manager, ["--version"]);
      const version = result.stdout.replace(/^v/, "");
      if (version) return version;
    } catch {
      // passed
    }
    logger.fatal(`${manager} is not installed or could not be detected.`);
  }

  export function isInstalled(pkg: string): boolean {
    try {
      const raw = manifest.sync();
      if (!raw.dependencies) return false;
      return pkg in raw.dependencies;
    } catch {
      return false;
    }
  }

  function spawn(manager: PM, args: string[], opts: PMOptions): void {
    if (opts.corepack) {
      exec.sync("corepack", [manager, ...args], { cwd: opts.cwd });
    } else {
      exec.sync(manager, args, { cwd: opts.cwd });
    }
  }

  export function add(packages: string[], opts: PMOptions & { dev?: boolean; skipInstalled?: boolean } = {}): void {
    const toInstall = opts.skipInstalled ? packages.filter((p) => !isInstalled(p)) : packages;
    if (toInstall.length === 0) return;
    const manager = pkgm(opts.cwd);
    const sub = manager === "npm" ? "install" : "add";
    const flag = opts.dev ? (manager === "npm" ? ["--save-dev"] : ["-D"]) : [];
    spawn(manager, [sub, ...toInstall, ...flag], opts);
  }

  export function remove(packages: string[], opts: PMOptions = {}): void {
    const manager = pkgm(opts.cwd);
    const sub = manager === "npm" ? "uninstall" : "remove";
    spawn(manager, [sub, ...packages], opts);
  }

  export function install(opts: PMOptions = {}): void {
    spawn(pkgm(opts.cwd), ["install"], opts);
  }

  export function run(script: string, args: string[] = [], opts: PMOptions = {}): void {
    spawn(pkgm(opts.cwd), ["run", script, ...args], opts);
  }
}
