import { defineCommand } from "citty";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadPkg } from "../config/pkg.js";
import { bold, cyan } from "../utils/colors.js";

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
      default: ".env",
    },
    "node-options": {
      type: "string",
      description: "Extra options to pass to Node.js",
      valueHint: "options",
    },
  },
  async run({ args }) {
    let entry = args.entry;

    if (!entry) {
      const pkg = loadPkg();
      if (pkg.main) {
        entry = resolve(pkg.main);
      } else {
        // default fallback
        const candidates = [join("dist", "index.js"), join("dist", "index.mjs"), join("dist", "main.js")];
        for (const c of candidates) {
          if (existsSync(c)) {
            entry = c;
            break;
          }
        }
      }
    }

    if (!entry || !existsSync(entry)) {
      process.stderr.write(`Cannot find compiled output. Run ${bold(cyan("minimajs build"))} first.\n`);
      process.exit(1);
    }

    const nodeArgs: string[] = [];
    if (args["node-options"]) nodeArgs.push(...args["node-options"].split(" "));

    const envFile = args["env-file"];
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (envFile && existsSync(envFile)) {
      const { config } = await import("dotenv");
      const result = config({ path: envFile });
      Object.assign(env, result.parsed ?? {});
    }

    execFileSync(process.execPath, [...nodeArgs, entry], {
      stdio: "inherit",
      env,
    });
  },
});
