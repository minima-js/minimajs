import { join } from "node:path";
import { exec } from "../utils/exec.js";
import { exists } from "../utils/fs.js";
import { manifest } from "../manifest/index.js";
import { logger } from "#/utils/logger.js";
import { corepack, type CorepackPM } from "../corepack/index.js";
import { isCorepackEnabled } from "../config/loader.js";

import chalk from "chalk";

export type ResolvedPM =
  | {
      manager: PM;
      version: string;
      isCorepack: false;
    }
  | {
      manager: CorepackPM;
      version: string;
      isCorepack: true;
    };

interface PMArg {
  manager: PM;
  versionHint?: string;
}

function parsePMArg(arg: string): PMArg {
  const atIndex = arg.indexOf("@");
  if (atIndex === -1) {
    if (!pkgm.isValid(arg)) {
      logger.fatal(`Invalid package manager: ${chalk.bold(arg)}. Must be one of: ${pkgm.VALID.join(", ")}, yarn@<version>`);
    }
    return { manager: arg };
  }

  const name = arg.slice(0, atIndex);
  const versionHint = arg.slice(atIndex + 1) || undefined;
  if (!pkgm.isValid(name)) {
    logger.fatal(`Invalid package manager: ${chalk.bold(arg)}. Must be one of: ${pkgm.VALID.join(", ")}, yarn@<version>`);
  }
  return { manager: name, versionHint };
}
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
    npm: "node_modules/.bin/minimajs",
    pnpm: "pnpm exec minimajs",
    yarn: "yarn minimajs",
  };

  export const VALID: readonly PM[] = ["bun", "pnpm", "yarn", "npm"];

  export function isValid(manager: string): manager is PM {
    return (VALID as readonly string[]).includes(manager);
  }

  export function resolve(pmArg?: string, forceCorepack?: boolean): ResolvedPM {
    if (forceCorepack) {
      corepack.ensure();
    }

    if (!pmArg) {
      const agent = pkgm.userAgent();
      const manager = agent?.manager ?? "npm";
      const version = agent?.version ?? pkgm.version("npm");
      if (forceCorepack && corepack.isManaged(manager)) {
        return { isCorepack: true, manager, version: corepack.version(manager, version) };
      }
      return { isCorepack: false, manager, version };
    }

    const { manager, versionHint } = parsePMArg(pmArg);

    if (corepack.isManaged(manager) && (forceCorepack || versionHint)) {
      corepack.ensure();
      return { isCorepack: true, manager, version: corepack.version(manager, versionHint ?? "latest") };
    }

    return { isCorepack: false, manager, version: pkgm.version(manager) };
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

  export interface AddOptions extends PMOptions {
    manager?: PM;
    dev?: boolean;
    skipInstalled?: boolean;
  }

  function spawn(manager: PM, args: string[], opts: PMOptions): void {
    const useCorepack = opts.corepack ?? isCorepackEnabled;
    if (useCorepack) {
      corepack.ensure();
      corepack(manager as CorepackPM, args, { cwd: opts.cwd });
    } else {
      exec.sync(manager, args, { cwd: opts.cwd });
    }
  }

  export function add(packages: string[], opts: AddOptions = {}): void {
    let toInstall = packages;
    if (opts.skipInstalled) {
      const raw = manifest.sync(opts.cwd);
      const installed = { ...raw.dependencies, ...raw.devDependencies };
      toInstall = packages.filter((p) => !(p in installed));
    }
    if (toInstall.length === 0) return;
    const { manager = pkgm(opts.cwd) } = opts;
    const sub = manager === "npm" ? "install" : "add";
    const flag = opts.dev ? (manager === "npm" ? ["--save-dev"] : ["-D"]) : [];
    spawn(manager, [sub, ...toInstall, ...flag], opts);
  }

  export function remove(packages: string[], opts: PMOptions = {}): void {
    const manager = pkgm(opts.cwd);
    const sub = manager === "npm" ? "uninstall" : "remove";
    spawn(manager, [sub, ...packages], opts);
  }

  export interface InstallOptions extends PMOptions {
    manager?: PM;
    frozen?: boolean;
  }

  export function install(opts: InstallOptions = {}): void {
    const manager = opts.manager ?? pkgm(opts.cwd);
    if (opts.frozen && manager === "npm") {
      spawn(manager, ["ci"], opts);
      return;
    }
    const frozenFlag = opts.frozen ? (manager === "yarn" ? "--immutable" : "--frozen-lockfile") : null;
    spawn(manager, frozenFlag ? ["install", frozenFlag] : ["install"], opts);
  }

  export function run(script: string, args: string[] = [], opts: PMOptions = {}): void {
    spawn(pkgm(opts.cwd), ["run", script, ...args], opts);
  }
}
