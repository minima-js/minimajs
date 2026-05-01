import { defineCommand } from "citty";
import { join, relative, dirname } from "node:path";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { toCamel } from "#/utils/str.js";
import { templates } from "../templates/index.js";
import { suggestModule, applyPatch } from "../patch.js";
import { resolveCwd, relativeId } from "#/utils/path.js";

function handle({ args }: { args: { name: string; dir: string } }) {
  const segments = args.name.split("/");
  const middlewareName = segments.at(-1)!;
  const folderSegments = segments.slice(0, -1);
  const cwd = process.cwd();

  const srcDir = resolveCwd(args.dir);

  const middlewareDir = folderSegments.length === 0 ? join(srcDir, "middlewares") : join(srcDir, ...folderSegments);
  const middlewareFile = join(middlewareDir, `${middlewareName}.middleware.ts`);

  const moduleFile = join(srcDir, "module.ts");

  if (exists(middlewareFile)) {
    logger.fatal(`Middleware already exists at ${chalk.cyan(relativeId(middlewareFile))}`);
  }

  const instance = toCamel(middlewareName);
  const importFrom = "./" + relative(dirname(moduleFile), middlewareFile).replace(/\.ts$/, ".js");

  text.write.sync(middlewareFile, templates.middleware({ instance }), { ensuredir: true });

  const suggestion = suggestModule(cwd, { from: importFrom, imported: instance, plugin: instance }, moduleFile);
  if (suggestion) applyPatch(suggestion);

  const patchedPath = "./" + relative(cwd, moduleFile);
  const createdPath = "./" + relative(cwd, middlewareFile);

  logger.info(
    "",
    `  ${chalk.green("✔")} Created middleware ${chalk.bold(chalk.cyan(args.name))}`,
    "",
    `  ${chalk.dim("Created:")}  ${chalk.cyan(createdPath)}`,
    `  ${chalk.dim("Patched:")}  ${chalk.cyan(patchedPath)}`,
    ""
  );
}

export const middleware = defineCommand({
  meta: { name: "middleware", description: "Scaffold a middleware and register it in the root module" },
  args: {
    name: {
      type: "positional",
      description: "Middleware name, or folder/name to place it in a subfolder",
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
