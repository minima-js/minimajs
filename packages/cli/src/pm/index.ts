import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { exec, execSafe } from "../exec/index.js";

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

  // 2. Lockfile detection
  for (const [file, pm] of LOCKFILES) {
    if (existsSync(join(cwd, file))) return pm;
  }

  // 3. Binary probe
  for (const pm of ["bun", "pnpm", "yarn"] as const) {
    if (execSafe(pm, ["--version"], { stdio: ["ignore", "ignore", "ignore"] }).ok) return pm;
  }

  return "npm";
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
