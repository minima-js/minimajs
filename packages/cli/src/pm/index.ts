import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { exec, execCapture } from "../exec/index.js";

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
    const result = execCapture("yarn", ["--version"], { cwd });
    const major = parseInt(result.stdout.trim().replace(/^v/, ""), 10);
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
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as { packageManager?: string };
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
    if (existsSync(join(cwd, file))) return detected;
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
    const result = execCapture(manager, ["--version"]);
    // strip any leading 'v' (e.g. yarn classic outputs "1.22.22")
    const version = result.stdout.trim().replace(/^v/, "");
    if (!version) return null;
    return `${manager}@${version}`;
  } catch {
    return null;
  }
}

export function add(packages: string[], opts: PMOptions & { dev?: boolean } = {}): void {
  const pm = detect(opts.cwd);
  const sub = pm === "npm" ? "install" : "add";
  const flag = opts.dev ? (pm === "npm" ? ["--save-dev"] : ["-D"]) : [];
  exec(pm, [sub, ...packages, ...flag], { cwd: opts.cwd });
}

export function remove(packages: string[], opts: PMOptions = {}): void {
  const pm = detect(opts.cwd);
  const sub = pm === "npm" ? "uninstall" : "remove";
  exec(pm, [sub, ...packages], { cwd: opts.cwd });
}

export function install(opts: PMOptions = {}): void {
  const pm = detect(opts.cwd);
  exec(pm, ["install"], { cwd: opts.cwd });
}

export function run(script: string, args: string[] = [], opts: PMOptions = {}): void {
  const pm = detect(opts.cwd);
  exec(pm, ["run", script, ...args], { cwd: opts.cwd });
}
