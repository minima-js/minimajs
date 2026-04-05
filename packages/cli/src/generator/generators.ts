import { join } from "node:path";
import { resolveCwd } from "../utils/path.js";
import chalk from "chalk";
import { exists, text, mkdir } from "../utils/fs.js";
import { templates, type GeneratorType } from "./templates/index.js";
import { toPascal, toCamel } from "../utils/str.js";
import { logger } from "../utils/logger.js";

export async function generateFile(type: GeneratorType, name: string, dir = "src"): Promise<void> {
  const targetDir = resolveCwd(dir, name);
  const filePath = join(targetDir, `${type}.ts`);

  if (exists(filePath)) {
    process.stderr.write(`  ${type} ${chalk.bold(name)} already exists at ${chalk.cyan(filePath)}\n`);
    process.exit(1);
  }

  const pascal = toPascal(name);
  const camel = toCamel(name);
  const content = templates[type]({
    Name: pascal,
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
