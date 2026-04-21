import { defineCommand } from "citty";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { exists, text, mkdir } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../templates/index.js";

function handle({ args }: { args: { name: string; dir: string } }) {
  const { name, dir } = args;
  const modulePath = resolve(dir, name);
  const moduleName = name.split("/").at(-1) ?? name;

  if (exists(join(modulePath, "module.ts"))) {
    logger.fatal(`Module ${chalk.bold(name)} already exists at ${chalk.cyan(modulePath)}`);
  }

  const pascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const vars = { Name: pascal, name: moduleName };
  const handlerFile = `${moduleName}.handler.ts`;

  const segments = name.split("/");
  const createdParents: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    const parentPath = resolve(dir, segments.slice(0, i).join("/"));
    const parentModule = join(parentPath, "module.ts");
    if (!exists(parentModule)) {
      mkdir.sync(parentPath);
      text.write.sync(parentModule, "");
      createdParents.push(join(dir, segments.slice(0, i).join("/"), "module.ts"));
    }
  }

  mkdir.sync(modulePath);
  text.write.sync(join(modulePath, "module.ts"), templates.module(vars));
  text.write.sync(join(modulePath, handlerFile), templates.handler());

  logger.info(
    "",
    `  ${chalk.green("✔")} Generated module ${chalk.bold(chalk.cyan(name))}`,
    "",
    `  ${chalk.dim("Created:")}`,
    ...createdParents.map((p) => `    ${chalk.cyan(p)}`),
    `    ${chalk.cyan(join(dir, name, "module.ts"))}`,
    `    ${chalk.cyan(join(dir, name, handlerFile))}`,
    ""
  );
}

export const module = defineCommand({
  meta: { name: "module", description: "Scaffold a new route module" },
  args: {
    name: {
      type: "positional",
      description: "Module name or path (e.g. users or api/users)",
      required: true,
    },
    dir: {
      type: "string",
      description: "Root source directory",
      valueHint: "path",
      default: "src",
    },
  },
  run: handle,
});
