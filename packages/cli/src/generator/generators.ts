import { join } from "node:path";
import { resolveCwd } from "../utils/path.js";
import chalk from "chalk";
import { exists, text, mkdir } from "../utils/fs.js";
import { templates } from "./templates/index.js";
import { toCamel } from "../utils/str.js";
import { logger } from "../utils/logger.js";

type GenerateFileTypes = keyof Pick<typeof templates, "hook" | "middleware" | "service" | "plugin">;

export async function generateFile(type: GenerateFileTypes, name: string, dir = "src"): Promise<void> {
  const targetDir = resolveCwd(dir, name);
  const filePath = join(targetDir, `${type}.ts`);

  if (exists(filePath)) {
    logger.fatal(`${type} ${chalk.bold(name)} already exists at ${chalk.cyan(filePath)}`);
  }

  const camel = toCamel(name);

  const content = templates[type]({
    name: camel,
    instance: camel + type.charAt(0).toUpperCase() + type.slice(1),
  });

  mkdir.sync(targetDir);
  await text.write(filePath, content);

  logger.info(
    "",
    `  ${chalk.green("✔")} Generated ${type} ${chalk.bold(chalk.cyan(name))}`,
    "",
    `  ${chalk.dim("Created:")}`,
    `    ${chalk.cyan(join(dir, name, `${type}.ts`))}`,
    ""
  );
}
