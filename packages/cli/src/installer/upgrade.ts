import { defineCommand } from "citty";
import chalk from "chalk";
import { exec } from "#/utils/exec.js";
import { logger } from "#/utils/logger.js";
import { manifest } from "#/manifest/index.js";
import { pkgm } from "#/pkgm/index.js";

const MINIMAJS_SCOPE = "@minimajs/";

type PM = ReturnType<typeof pkgm>;

function upgradeAll(manager: PM): void {
  if (manager === "bun") {
    exec.sync("bun", ["update"]);
  } else if (manager === "pnpm") {
    exec.sync("pnpm", ["update", "--latest"]);
  } else if (manager === "yarn" && pkgm.isYarnBerry()) {
    exec.sync("yarn", ["up"]);
  } else if (manager === "yarn") {
    exec.sync("yarn", ["upgrade", "--latest"]);
  } else {
    exec.sync("npm", ["update", "--save"]);
  }
}

function upgradeMinimajs(manager: PM, all: string[]): void {
  if (manager === "yarn" && pkgm.isYarnBerry()) {
    exec.sync("yarn", ["up", "@minimajs/*"]);
  } else if (manager === "yarn") {
    exec.sync("yarn", ["upgrade", "--scope", "@minimajs"]);
  } else if (manager === "pnpm") {
    exec.sync("pnpm", ["update", "@minimajs/*"]);
  } else {
    // npm and bun don't support glob patterns — pass explicit names
    exec.sync(manager, ["update", ...all]);
  }
}

function handle({ args }: { args: { all: boolean | undefined } }) {
  const manager = pkgm();

  if (args.all) {
    logger.info(`  Upgrading all packages with ${chalk.bold(manager)}...`);
    upgradeAll(manager);
    logger.info("", `  ${chalk.green("✔")} All packages upgraded`, "");
    return;
  }

  const info = manifest.sync.cached();
  const deps = Object.keys(info.dependencies ?? {}).filter((p) => p.startsWith(MINIMAJS_SCOPE));
  const devDeps = Object.keys(info.devDependencies ?? {}).filter((p) => p.startsWith(MINIMAJS_SCOPE));

  if (deps.length === 0 && devDeps.length === 0) {
    logger.info("", `  ${chalk.dim("No @minimajs/* packages found in package.json")}`, "");
    return;
  }

  logger.info(`  Upgrading ${chalk.bold("@minimajs/*")} packages with ${chalk.bold(manager)}...`);

  const all = [...deps, ...devDeps];
  upgradeMinimajs(manager, all);
  logger.info(
    "",
    `  ${chalk.green("✔")} Upgraded ${chalk.cyan(all.length.toString())} package${all.length === 1 ? "" : "s"}:`,
    ...all.map((p) => `    ${chalk.dim("·")} ${chalk.cyan(p)}`),
    ""
  );
}

export const upgradeCommand = defineCommand({
  meta: {
    name: "upgrade",
    description: "Upgrade @minimajs/* packages (or all with --full)",
  },
  args: {
    all: {
      type: "boolean",
      description: "Upgrade all packages",
    },
  },
  run: handle,
});
