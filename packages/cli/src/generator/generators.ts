import { join, resolve } from "node:path";
import { bold, cyan, green, dim } from "../utils/colors.js";
import { exists, text, mkdir } from "../utils/fs.js";
import { templates, type GeneratorType } from "./templates/index.js";
import { toPascal, toCamel } from "../utils/str.js";
import { print } from "../utils/logging.js";

export async function generateFile(type: GeneratorType, name: string, dir = "src"): Promise<void> {
  const targetDir = resolve(dir, name);
  const filePath = join(targetDir, `${type}.ts`);

  if (exists(filePath)) {
    process.stderr.write(`  ${type} ${bold(name)} already exists at ${cyan(filePath)}\n`);
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

  print(
    "",
    `  ${green("✔")} Generated ${type} ${bold(cyan(name))}`,
    "",
    `  ${dim("Created:")}`,
    `    ${cyan(join(dir, name, `${type}.ts`))}`,
    ""
  );
}
