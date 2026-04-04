import { defineCommand } from "citty";
import { join } from "node:path";
import { bold, cyan, green, dim } from "../utils/colors.js";
import { createSpinner } from "../utils/spinner.js";
import { print } from "../utils/logging.js";
import { templates } from "./templates/index.js";
import type { Runtime } from "../config/types.js";
import * as pm from "../pm/index.js";
import { exec } from "../exec/index.js";
import { exists, text, mkdir } from "../utils/fs.js";
import { runtime } from "../runtime/index.js";

const PM_EXEC: Record<Exclude<pm.PM, "bun">, string> = {
  npm: "npx --no minimajs",
  pnpm: "pnpm exec minimajs",
  yarn: "yarn minimajs",
};

function resolveVersionFileValue(rt: Runtime): string {
  if (rt === "bun" && typeof process.versions.bun === "string") return process.versions.bun;
  if (rt === "node" && typeof process.versions.bun !== "string") return process.versions.node;

  try {
    return exec.sync.capture(rt, ["--version"]).stdout.trim().replace(/^v/, "");
  } catch {
    return rt === "bun" ? "latest" : process.versions.node;
  }
}

function renderPackageJson(name: string, runtime: Runtime, packageManager?: string | null): string {
  const stub = runtime === "bun" ? templates.packageBun : templates.packageNode;
  const raw = stub({ name, packageManager: packageManager ?? "" });
  if (!packageManager) return raw.replace(/\n\s+"packageManager": "",/, "");
  return raw;
}

interface NewArgs {
  name: string;
  pm?: string;
  runtime?: string;
  install: boolean;
  git: boolean;
}

async function handle({ args }: { args: NewArgs }) {
  const { name, git } = args;
  const manager = (args.pm as pm.PM) ?? pm.detect();
  const rt = (args.runtime as Runtime) ?? runtime();
  const cwd = join(process.cwd(), name);

  if (exists(cwd)) {
    process.stderr.write(`Directory ${bold(name)} already exists.\n`);
    process.exit(1);
  }

  const packageManagerField = pm.getVersion(manager);
  const spinner = createSpinner();

  spinner.start(`Scaffolding ${bold(cyan(name))}...`);

  const versionFile = rt === "bun" ? ".bun-version" : ".node-version";
  const appContent =
    rt === "bun" ? templates.appBun({}) : templates.appNode({ exec: PM_EXEC[manager as Exclude<pm.PM, "bun">] });

  await mkdir(join(cwd, "src"));
  await Promise.all([
    text.write(join(cwd, "package.json"), renderPackageJson(name, rt, packageManagerField)),
    text.write(join(cwd, "tsconfig.json"), templates.tsconfig({})),
    text.write(join(cwd, "minimajs.config.ts"), templates.minimaJsConfig({ runtime: rt })),
    text.write(join(cwd, "src", "index.ts"), templates.index({ runtime: rt })),
    text.write(join(cwd, "src", "module.ts"), templates.rootModule({})),
    text.write(join(cwd, ".gitignore"), templates.gitignore({})),
    text.write(join(cwd, ".env"), templates.env({})),
    text.write(join(cwd, versionFile), resolveVersionFileValue(rt) + "\n"),
    text.write(join(cwd, "app"), appContent, { mode: 0o755 }),
  ]);

  spinner.succeed(`Scaffolded ${bold(cyan(name))}`);

  if (git) {
    exec.sync.safe("git", ["init"], { cwd });
    exec.sync.safe("git", ["add", "-A"], { cwd });
  }

  if (args.install) {
    spinner.start(`Installing dependencies with ${bold(manager)}...`);
    try {
      await pm.install({ cwd });
      spinner.succeed("Dependencies installed");
    } catch {
      spinner.fail(`Failed to install. Run ${bold(`${manager} install`)} manually.`);
    }
  }

  print(
    "",
    `  ${green("✔")} Project created at ${bold(cyan(`./${name}`))}`,
    "",
    `  ${dim("Next steps:")}`,
    `    ${cyan(`cd ${name}`)}`,
    `    ${cyan(`${manager} run dev`)}`,
    "",
    `  ${dim("Tip: use")} ${cyan("./app")} ${dim("as a shortcut for")} ${cyan("minimajs")}`,
    `    ${dim("e.g.")} ${cyan("./app add module users")}`,
    ""
  );
}

export const newCommand = defineCommand({
  meta: {
    name: "new",
    description: "Scaffold a new MinimaJS application",
  },
  args: {
    name: {
      type: "positional",
      description: "Project name / directory",
      required: true,
    },
    pm: {
      type: "string",
      description: "Package manager to use",
      valueHint: "bun|pnpm|yarn|npm",
    },
    runtime: {
      type: "string",
      description: "Runtime target",
      valueHint: "node|bun",
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
    git: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip git init",
    },
  },
  run: handle,
});
