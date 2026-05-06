import { exec } from "../utils/exec.js";
import { logger } from "../utils/logger.js";
import chalk from "chalk";
import type { PM } from "../pkgm/index.js";

export type CorepackPM = Exclude<PM, "bun">;

export interface CorepackOptions {
  cwd?: string;
}

export function corepack(manager: CorepackPM, args: string[], opts: CorepackOptions = {}): void {
  exec.sync("corepack", [manager, ...args], { cwd: opts.cwd });
}

export namespace corepack {
  let _installed: boolean | null = null;

  export function installed(): boolean {
    if (_installed !== null) return _installed;
    try {
      exec.capture.sync("corepack", ["--version"]);
      _installed = true;
    } catch {
      _installed = false;
    }
    return _installed;
  }

  export function ensure(): void {
    if (!installed()) {
      logger.fatal(`Corepack is required. Install it with: ${chalk.bold("npm install -g corepack")}`);
    }
  }

  export const manages: readonly CorepackPM[] = ["yarn", "pnpm", "npm"];

  export function isManaged(manager: PM): manager is CorepackPM {
    return (manages as readonly string[]).includes(manager);
  }

  export function version(manager: CorepackPM, hint?: string, opts: CorepackOptions = {}): string {
    const spec = hint ? `${manager}@${hint}` : manager;
    const { stdout } = exec.capture.sync("corepack", [spec, "--version"], {
      cwd: opts.cwd,
      env: { COREPACK_ENABLE_STRICT: "0" },
    });
    return stdout.replace(/^v/, "").trim();
  }
}
