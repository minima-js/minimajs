import { join } from "node:path";
import { exec } from "../utils/exec.js";
import { exists } from "../utils/fs.js";
import { manifest } from "../config/pkg.js";

export type PM = "bun" | "pnpm" | "yarn" | "npm";

export interface PMOptions {
  cwd?: string;
}

const LOCKFILES: [string, PM][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

/**
 * Returns true if the yarn binary in the given directory is yarn berry (v2+).
 * Runs `yarn --version` and checks the major version number.
 * Returns false if yarn is not installed or is classic (v1).
 */
export function isYarnBerry(cwd = process.cwd()): boolean {
  try {
    const { stdout } = exec.capture.sync("yarn", ["--version"], { cwd });
    const major = parseInt(stdout.replace(/^v/, ""), 10);
    return major >= 2;
  } catch {
    return false;
  }
}

function fromUserAgent(): PM | null {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("npm")) return "npm";
  return null;
}

export function detect(cwd = process.cwd()): PM {
  // 1. packageManager field in package.json (corepack standard)
  try {
    const pkg = manifest.sync();
    if (pkg.packageManager) {
      const name = pkg.packageManager.split("@")[0] as PM;
      if (["bun", "pnpm", "yarn", "npm"].includes(name)) return name;
    }
  } catch {
    // no package.json
  }

  // 2. How the CLI was invoked (bunx / npx / yarn / pnpm dlx)
  const agent = fromUserAgent();
  if (agent) return agent;

  // 3. Lockfile detection
  for (const [file, detected] of LOCKFILES) {
    if (exists(join(cwd, file))) return detected;
  }

  return "npm";
}

/**
 * Get the installed version of a PM and return a corepack-compatible
 * `packageManager` field value like `"npm@10.9.2"`.
 * Returns null if the version cannot be determined.
 */
export function getVersion(manager: PM): string | null {
  try {
    const result = exec.capture.sync(manager, ["--version"]);
    // strip any leading 'v' (e.g. yarn classic outputs "1.22.22")
    const version = result.stdout.replace(/^v/, "");
    if (!version) return null;
    return `${manager}@${version}`;
  } catch {
    return null;
  }
}

export const EXEC: Record<Exclude<PM, "bun">, string> = {
  npm: "npx --no minimajs",
  pnpm: "pnpm exec minimajs",
  yarn: "yarn minimajs",
};

export function isInstalled(pkg: string): boolean {
  try {
    const raw = manifest.sync();
    if (!raw.dependencies) return false;
    return pkg in raw.dependencies;
  } catch {
    return false;
  }
}

export function add(packages: string[], opts: PMOptions & { dev?: boolean; skipInstalled?: boolean } = {}): void {
  const toInstall = opts.skipInstalled ? packages.filter((p) => !isInstalled(p)) : packages;
  if (toInstall.length === 0) return;
  const pm = detect(opts.cwd);
  const sub = pm === "npm" ? "install" : "add";
  const flag = opts.dev ? (pm === "npm" ? ["--save-dev"] : ["-D"]) : [];
  exec.sync(pm, [sub, ...toInstall, ...flag], { cwd: opts.cwd });
}

export function remove(packages: string[], opts: PMOptions = {}): void {
  const pm = detect(opts.cwd);
  const sub = pm === "npm" ? "uninstall" : "remove";
  exec.sync(pm, [sub, ...packages], { cwd: opts.cwd });
}

export function install(opts: PMOptions = {}): void {
  const pm = detect(opts.cwd);
  exec.sync(pm, ["install"], { cwd: opts.cwd });
}

export function run(script: string, args: string[] = [], opts: PMOptions = {}): void {
  const pm = detect(opts.cwd);
  exec.sync(pm, ["run", script, ...args], { cwd: opts.cwd });
}
