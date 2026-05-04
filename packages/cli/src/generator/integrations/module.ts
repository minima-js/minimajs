import { defineCommand } from "citty";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { exists, text, mkdir } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { toSingular } from "#/utils/str.js";
import { templates } from "../templates/index.js";

function handle({ args }: { args: { name: string; dir: string; force: boolean; crud: boolean } }) {
  const { name, dir } = args;
  const modulePath = resolve(dir, name);
  const moduleName = name.split("/").at(-1) ?? name;

  if (!args.force && exists(join(modulePath, "module.ts"))) {
    logger.fatal(`Module ${chalk.bold(name)} already exists at ${chalk.cyan(modulePath)} (use --force to overwrite)`);
  }

  const pascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const singular = toSingular(moduleName);
  const vars = { Name: pascal, name: moduleName, singular };
  const handlerFile = `${moduleName}.handler.ts`;
  const repositoryFile = `${moduleName}.repository.ts`;

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

  if (args.crud) {
    text.write.sync(join(modulePath, "module.ts"), templates.crudModule(vars));
    text.write.sync(join(modulePath, handlerFile), templates.crudHandler(vars));
    text.write.sync(join(modulePath, repositoryFile), templates.crudRepository(vars));
  } else {
    text.write.sync(join(modulePath, "module.ts"), templates.module(vars));
    text.write.sync(join(modulePath, handlerFile), templates.handler());
  }

  const createdFiles = args.crud
    ? [join(dir, name, "module.ts"), join(dir, name, handlerFile), join(dir, name, repositoryFile)]
    : [join(dir, name, "module.ts"), join(dir, name, handlerFile)];

  logger.info(
    "",
    `  ${chalk.green("✔")} Generated ${args.crud ? "CRUD " : ""}module ${chalk.bold(chalk.cyan(name))}`,
    "",
    `  ${chalk.dim("Created:")}`,
    ...createdParents.map((p) => `    ${chalk.cyan(p)}`),
    ...createdFiles.map((f) => `    ${chalk.cyan(f)}`),
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
    force: {
      type: "boolean",
      alias: ["f"],
      description: "Overwrite existing module files",
      default: false,
    },
    crud: {
      type: "boolean",
      description: "Scaffold full CRUD routes, handler, and in-memory repository",
      default: false,
    },
  },
  run: handle,
});
