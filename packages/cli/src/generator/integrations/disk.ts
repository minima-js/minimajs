import { defineCommand } from "citty";
import { dirname, join } from "node:path";
import chalk from "chalk";
import { exists, text, mkdir } from "../../utils/fs.js";
import { withSpinner } from "../../utils/spinner.js";
import { logger } from "../../utils/logger.js";
import { diskTemplates } from "../templates/index.js";
import * as pm from "../../pm/index.js";

const drivers = {
  file: {
    packages: ["@minimajs/disk"],
    files: [{ path: "src/common/disk.ts", content: diskTemplates.file({}) }],
  },
  s3: {
    packages: ["@minimajs/disk", "@minimajs/aws-s3"],
    files: [{ path: "src/common/disk.ts", content: diskTemplates.s3({}) }],
  },
  "azure-blob": {
    packages: ["@minimajs/disk", "@minimajs/azure-blob"],
    files: [{ path: "src/common/disk.ts", content: diskTemplates["azure-blob"]({}) }],
  },
};

type Driver = keyof typeof drivers;

export const disk = defineCommand({
  meta: { name: "disk", description: "Install disk file storage" },
  args: {
    driver: {
      type: "string",
      description: `Storage driver (${Object.keys(drivers).join(", ")})`,
      default: "file",
    },
  },
  async run({ args }) {
    const driver = args.driver as Driver;
    if (!(driver in drivers)) {
      process.stderr.write(
        `  Unknown driver: ${chalk.bold(driver)}\n  Available: ${chalk.cyan(Object.keys(drivers).join(", "))}\n`
      );
      process.exit(1);
    }

    const { packages, files } = drivers[driver];
    const pkgs = packages.join(" ");

    await withSpinner(`Installing ${chalk.bold(pkgs)}...`, () => pm.add([...packages])).catch(() => {
      process.stderr.write(`  Run ${chalk.bold(`${pm.detect()} add ${pkgs}`)} manually\n`);
    });

    const created: string[] = [];
    for (const file of files) {
      const fullPath = join(process.cwd(), file.path);
      if (exists(fullPath)) {
        logger.info(`  ${chalk.yellow("!")} Skipped ${chalk.cyan(file.path)} (already exists)`);
        continue;
      }
      mkdir.sync(dirname(fullPath));
      await text.write(fullPath, file.content);
      created.push(file.path);
    }

    logger.info(
      "",
      `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("disk"))}${driver !== "file" ? ` (${driver})` : ""} — Disk file storage`,
      "",
      ...(created.length > 0 ? [`  ${chalk.dim("Created:")}`, ...created.map((f) => `    ${chalk.cyan(f)}`)] : []),
      ""
    );
  },
});
