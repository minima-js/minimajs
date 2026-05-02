import { exec } from "../utils/exec.js";
import type { PM } from "../pkgm/index.js";

export type CorepackPM = Exclude<PM, "bun">;

export interface CorepackOptions {
  cwd?: string;
}

export function corepack(): boolean {
  try {
    exec.capture.sync("corepack", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export namespace corepack {
  export const manages: readonly CorepackPM[] = ["yarn", "pnpm", "npm"];

  export function isManaged(manager: PM): manager is CorepackPM {
    return (manages as readonly string[]).includes(manager);
  }

  export function version(manager: CorepackPM, hint: string, opts: CorepackOptions = {}): string {
    const { stdout } = exec.capture.sync("corepack", [`${manager}@${hint}`, "--version"], { cwd: opts.cwd });
    return stdout.replace(/^v/, "").trim();
  }

}
