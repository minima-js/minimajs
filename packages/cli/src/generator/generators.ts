import { join } from "node:path";
import { resolveCwd } from "../utils/path.js";
import chalk from "chalk";
import { exists, text } from "../utils/fs.js";
import { templates } from "./templates/index.js";
import { toCamel } from "../utils/str.js";
import { logger } from "../utils/logger.js";

type GenerateFileTypes = keyof Pick<typeof templates, "middleware" | "service" | "plugin">;

export function generateFile(type: GenerateFileTypes, name: string, dir = "src"): void {
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

  text.write.sync(filePath, content, { ensuredir: true });

  logger.info(
    "",
    `  ${chalk.green("✔")} Generated ${type} ${chalk.bold(chalk.cyan(name))}`,
    "",
    `  ${chalk.dim("Created:")}`,
    `    ${chalk.cyan(join(dir, name, `${type}.ts`))}`,
    ""
  );
}
