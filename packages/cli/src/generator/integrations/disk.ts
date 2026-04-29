import { defineCommand } from "citty";
import { join, relative } from "node:path";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { toCamel } from "#/utils/str.js";
import { templates } from "../templates/index.js";
import { resolveCwd, relativeId } from "#/utils/path.js";
import * as pm from "#/pm/index.js";

const drivers = {
  file: {
    packages: ["@minimajs/disk"],
    template: (instance: string) => templates.disk.file({ instance }),
  },
  "aws-s3": {
    packages: ["@minimajs/disk", "@minimajs/aws-s3"],
    template: (instance: string) => templates.disk.s3({ instance }),
  },
  "azure-blob": {
    packages: ["@minimajs/disk", "@minimajs/azure-blob"],
    template: (instance: string) => templates.disk["azure-blob"]({ instance }),
  },
};

type Driver = keyof typeof drivers;

function handle({ args }: { args: { name?: string; driver: string; proto: boolean; install: boolean } }) {
  const cwd = process.cwd();
  const srcDir = resolveCwd("src");
  const named = !!args.name;
  const instance = named ? toCamel(args.name!) : "disk";
  const diskFile = join(srcDir, "disks", named ? `${args.name}.ts` : "index.ts");

  if (exists(diskFile)) {
    logger.fatal(`Disk already exists at ${chalk.cyan(relativeId(diskFile))}`);
  }

  let content: string;
  let packages: string[];

  if (args.proto) {
    content = templates.disk.proto({ instance });
    packages = ["@minimajs/disk"];
  } else {
    const driver = args.driver as Driver;
    if (!(driver in drivers)) {
      logger.fatal(`Unknown driver: ${chalk.bold(driver)}. Available: ${chalk.cyan(Object.keys(drivers).join(", "))}`);
    }
    const { packages: driverPackages, template } = drivers[driver];
    content = template(instance);
    packages = driverPackages;
  }

  if (args.install) {
    logger.info(`  Installing ${chalk.bold(packages.join(" "))}...`);
    pm.add(packages, { skipInstalled: true });
  }

  text.write.sync(diskFile, content, { ensuredir: true });

  const createdPath = "./" + relative(cwd, diskFile);

  logger.info(
    "",
    `  ${chalk.green("✔")} Created disk ${chalk.bold(chalk.cyan(args.name ?? "disk"))}`,
    "",
    `  ${chalk.dim("Created:")}  ${chalk.cyan(createdPath)}`,
    ""
  );
}

export const disk = defineCommand({
  meta: { name: "disk", description: "Scaffold a disk storage instance" },
  args: {
    name: {
      type: "positional",
      description: "Disk name (e.g. uploads) — omit to create src/disks/index.ts",
      required: false,
    },
    driver: {
      alias: ["d"],
      type: "string",
      description: `Storage driver (${Object.keys(drivers).join(", ")})`,
      default: "file",
    },
    proto: {
      type: "boolean",
      description: "Create a ProtoDisk for multi-provider routing",
      default: false,
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
  },
  run: handle,
});
