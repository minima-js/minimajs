import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { defineCommand } from "citty";
import chalk from "chalk";
import { loadConfig } from "../config/index.js";
import { loadPkg } from "../config/pkg.js";
import { logger } from "../utils/logger.js";
import { loadEnvFile } from "../utils/env.js";
import { exists } from "../utils/fs.js";
import { runtime } from "../runtime/index.js";

export interface StartOptions {
  entry?: string;
  envFile?: string;
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
    logger.fatal(`Cannot find compiled output. Run ${chalk.bold(chalk.cyan("minimajs build"))} first.`);
  }

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (opts.envFile) {
    Object.assign(env, loadEnvFile(opts.envFile));
  }

  const bin = runtime.bin(runtime.detect());
  const args = config.sourcemap && runtime.isNode(bin) ? ["--enable-source-maps", entry!] : [entry!];
  execFileSync(bin, args, { stdio: "inherit", env });
}

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description: "Run the compiled production build",
  },
  args: {
    entry: {
      type: "positional",
      description: "Compiled entry file (auto-detected from package.json if omitted)",
      required: false,
    },
    "env-file": {
      type: "string",
      description: "Path to .env file",
      valueHint: "path",
    },
  },
  run({ args }) {
    return runStart({
      entry: args.entry,
      envFile: args["env-file"],
    });
  },
});
