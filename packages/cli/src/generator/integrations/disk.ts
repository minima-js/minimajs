import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../templates/index.js";
import * as pm from "#/pm/index.js";

const drivers = {
  file: {
    packages: ["@minimajs/disk"],
    files: [{ path: "src/shared/disk.ts", content: templates.disk.file() }],
  },
  "aws-s3": {
    packages: ["@minimajs/disk", "@minimajs/aws-s3"],
    files: [{ path: "src/shared/aws-s3.disk.ts", content: templates.disk.s3() }],
  },
  "azure-blob": {
    packages: ["@minimajs/disk", "@minimajs/azure-blob"],
    files: [{ path: "src/shared/azure-blob.disk.ts", content: templates.disk["azure-blob"]() }],
  },
};

type Driver = keyof typeof drivers;

function handle({ args }: { args: { driver: string; install: boolean } }) {
  const driver = args.driver as Driver;
  if (!(driver in drivers)) {
    logger.fatal(`Unknown driver: ${chalk.bold(driver)}. Available: ${chalk.cyan(Object.keys(drivers).join(", "))}`);
  }

  const { packages, files } = drivers[driver];
  const pkgs = packages.join(" ");

  if (args.install) {
    logger.info(`  Installing ${chalk.bold(pkgs)}...`);
    pm.add(packages, { skipInstalled: true });
  }

  const created: string[] = [];
  for (const file of files) {
    if (exists(file.path)) {
      logger.info(`  ${chalk.yellow("!")} Skipped ${chalk.cyan(file.path)} (already exists)`);
      continue;
    }
    text.write.sync(file.path, file.content, { ensuredir: true });
    created.push(file.path);
  }

  logger.info(
    "",
    `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("disk"))}${driver !== "file" ? ` (${driver})` : ""} — Disk file storage`,
    "",
    ...(created.length > 0 ? [`  ${chalk.dim("Created:")}`, ...created.map((f) => `    ${chalk.cyan(f)}`)] : []),
    ""
  );
}

export const disk = defineCommand({
  meta: { name: "disk", description: "Install disk file storage" },
  args: {
    driver: {
      alias: ["d"],
      type: "string",
      description: `Storage driver (${Object.keys(drivers).join(", ")})`,
      default: "file",
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
  },
  run: handle,
});
