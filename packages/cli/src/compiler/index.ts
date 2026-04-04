import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { handleAction } from "./esbuild/index.js";
import { loadConfig } from "../config/index.js";
import { loadPkg } from "../config/pkg.js";
import type { Runtime } from "../config/types.js";
import { bold, cyan } from "../utils/colors.js";
import { loadEnvFile } from "../utils/env.js";
import { exists } from "../utils/fs.js";
import type { CliOption } from "../command.js";
import { runtime } from "../runtime/index.js";

export interface DevOptions {
  envFile?: string;
  tsconfig?: string;
  ignoreTypes?: boolean;
  reset?: boolean;
  killSignal?: NodeJS.Signals;
  grace?: boolean | undefined;
}

export interface BuildOptions {
  outdir?: string;
  minify?: boolean;
  sourcemap?: boolean;
  tsconfig?: string;
  ignoreTypes?: boolean;
  target?: string;
}

export interface StartOptions {
  entry?: string;
  envFile?: string;
}

export async function runDev(opts: DevOptions): Promise<void> {
  const cliOption: CliOption = {
    watch: true,
    clean: false,
    envFile: opts.envFile,
    tsconfig: opts.tsconfig,
    ignoreTypes: opts.ignoreTypes,
    reset: opts.reset,
    killSignal: opts.killSignal,
    grace: opts.grace === false ? false : undefined,
  };
  await handleAction(cliOption);
}

export async function runBuild(opts: BuildOptions): Promise<void> {
  const cliOption: CliOption = {
    clean: true,
    minify: opts.minify,
    sourcemap: opts.sourcemap,
    outdir: opts.outdir,
    tsconfig: opts.tsconfig,
    ignoreTypes: opts.ignoreTypes,
    target: opts.target,
  };
  await handleAction(cliOption);
}

function resolveRuntimeBin(rt: Runtime): string {
  const inBun = typeof process.versions.bun === "string";
  if (rt === "bun") return inBun ? process.execPath : "bun";
  return inBun ? "node" : process.execPath;
}

function resolveStartArgs(entry: string, rt: Runtime, sourcemap: boolean): string[] {
  if (rt === "node" && sourcemap) {
    return ["--enable-source-maps", entry];
  }

  return [entry];
}

export async function runStart(opts: StartOptions): Promise<void> {
  let entry = opts.entry;
  const config = await loadConfig();

  if (!entry) {
    const pkg = loadPkg();
    if (pkg.main) {
      entry = resolve(pkg.main);
    } else {
      const candidates = [join("dist", "index.js"), join("dist", "index.mjs"), join("dist", "main.js")];
      for (const c of candidates) {
        if (exists(c)) {
          entry = c;
          break;
        }
      }
    }
  }

  if (!entry || !exists(entry)) {
    process.stderr.write(`Cannot find compiled output. Run ${bold(cyan("minimajs build"))} first.\n`);
    process.exit(1);
  }

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (opts.envFile) {
    Object.assign(env, loadEnvFile(opts.envFile));
  }

  const rt = config.runtime ?? runtime.detect();
  execFileSync(resolveRuntimeBin(rt), resolveStartArgs(entry, rt, config.sourcemap), { stdio: "inherit", env });
}
