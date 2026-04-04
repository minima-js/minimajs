import { defineCommand } from "citty";
import { join, resolve } from "node:path";
import { bold, cyan, green, dim } from "../../utils/colors.js";
import { exists, text, mkdir } from "../../utils/fs.js";
import { print } from "../../utils/logging.js";
import { templates } from "../templates/index.js";

async function handle({ args }: { args: { name: string; dir: string } }) {
  const { name, dir } = args;
  const modulePath = resolve(dir, name);
  const moduleName = name.split("/").at(-1) ?? name;

  if (exists(join(modulePath, "module.ts"))) {
    process.stderr.write(`  Module ${bold(name)} already exists at ${cyan(modulePath)}\n`);
    process.exit(1);
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
      await text.write(parentModule, "");
      createdParents.push(join(dir, segments.slice(0, i).join("/"), "module.ts"));
    }
  }

  mkdir.sync(modulePath);
  await text.write(join(modulePath, "module.ts"), templates.module(vars));
  await text.write(join(modulePath, handlerFile), templates.handler(vars));

  print(
    "",
    `  ${green("✔")} Generated module ${bold(cyan(name))}`,
    "",
    `  ${dim("Created:")}`,
    ...createdParents.map((p) => `    ${cyan(p)}`),
    `    ${cyan(join(dir, name, "module.ts"))}`,
    `    ${cyan(join(dir, name, handlerFile))}`,
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
