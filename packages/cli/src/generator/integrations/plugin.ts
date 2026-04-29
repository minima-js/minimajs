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
  const pluginName = segments.at(-1)!;
  const moduleSegments = segments.slice(0, -1);
  const isRootLevel = moduleSegments.length === 0;
  const cwd = process.cwd();

  const srcDir = resolveCwd(args.dir);

  const pluginDir = isRootLevel ? join(srcDir, "plugins") : join(srcDir, ...moduleSegments);
  const pluginFile = join(pluginDir, `${pluginName}.plugin.ts`);

  const moduleFile = isRootLevel ? join(srcDir, "module.ts") : join(srcDir, ...moduleSegments, "module.ts");

  if (exists(pluginFile)) {
    logger.fatal(`Plugin already exists at ${chalk.cyan(relativeId(pluginFile))}`);
  }

  if (!isRootLevel && !exists(moduleFile)) {
    logger.fatal(
      `Module not found at ${chalk.cyan(moduleFile)} — run ${chalk.bold(`./app add module ${moduleSegments.join("/")}`)}`
    );
  }

  const instance = toCamel(pluginName);
  const importFrom = "./" + relative(dirname(moduleFile), pluginFile).replace(/\.ts$/, ".js");

  text.write.sync(pluginFile, templates.plugin({ instance }), { ensuredir: true });

  const suggestion = suggestModule(cwd, { from: importFrom, imported: instance, plugin: instance }, moduleFile);
  if (suggestion) applyPatch(suggestion);

  const patchedPath = "./" + relative(cwd, moduleFile);
  const createdPath = "./" + relative(cwd, pluginFile);

  logger.info(
    "",
    `  ${chalk.green("✔")} Created plugin ${chalk.bold(chalk.cyan(args.name))}`,
    "",
    `  ${chalk.dim("Created:")}  ${chalk.cyan(createdPath)}`,
    `  ${chalk.dim("Patched:")}  ${chalk.cyan(patchedPath)}`,
    ""
  );
}

export const plugin = defineCommand({
  meta: { name: "plugin", description: "Scaffold a plugin and register it in the nearest module" },
  args: {
    name: {
      type: "positional",
      description: "Plugin name, or module/plugin-name to scope to a module",
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
