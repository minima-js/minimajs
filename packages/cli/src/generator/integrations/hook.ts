import { defineCommand } from "citty";
import { join, relative, dirname } from "node:path";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { toCamel } from "#/utils/str.js";
import { templates } from "../templates/index.js";
import { suggestModule, suggestIndex, applyPatch } from "../patch.js";
import { resolveCwd, relativeId } from "#/utils/path.js";

function handle({ args }: { args: { name: string; type: string; dir: string; global: boolean } }) {
  const hookType = args.type;
  const segments = args.name.split("/");
  const hookName = segments.at(-1)!;
  const moduleSegments = segments.slice(0, -1);
  const isRootLevel = moduleSegments.length === 0;
  const cwd = process.cwd();

  const srcDir = resolveCwd(args.dir);

  const hookDir = isRootLevel ? join(srcDir, "hooks") : join(srcDir, ...moduleSegments);
  const hookFile = join(hookDir, `${hookName}.hook.ts`);

  const moduleFile = isRootLevel ? join(srcDir, "module.ts") : join(srcDir, ...moduleSegments, "module.ts");
  const indexFile = join(srcDir, "index.ts");

  if (exists(hookFile)) {
    logger.fatal(`Hook already exists at ${chalk.cyan(relativeId(hookFile))}`);
  }

  if (!args.global && !isRootLevel && !exists(moduleFile)) {
    logger.fatal(
      `Module not found at ${chalk.cyan(moduleFile)} — run ${chalk.bold(`./app add module ${moduleSegments.join("/")}`)}`
    );
  }

  const instance = toCamel(hookName);

  const patchTarget = args.global ? indexFile : moduleFile;
  const importFrom = "./" + relative(dirname(patchTarget), hookFile).replace(/\.ts$/, ".js");

  text.write.sync(hookFile, templates.hook({ instance, hookType }), { ensuredir: true });

  const suggestion = args.global
    ? suggestIndex(cwd, { from: importFrom, imported: instance, plugin: instance })
    : suggestModule(cwd, { from: importFrom, imported: instance, plugin: instance }, moduleFile);

  if (suggestion) applyPatch(suggestion);

  const patchedPath = "./" + relative(cwd, patchTarget);
  const createdPath = "./" + relative(cwd, hookFile);

  logger.info(
    "",
    `  ${chalk.green("✔")} Created hook ${chalk.bold(chalk.cyan(args.name))}`,
    "",
    `  ${chalk.dim("Created:")}  ${chalk.cyan(createdPath)}`,
    `  ${chalk.dim("Patched:")}  ${chalk.cyan(patchedPath)}`,
    ""
  );
}

export const hook = defineCommand({
  meta: { name: "hook", description: "Scaffold a lifecycle hook and register it in the nearest module" },
  args: {
    name: {
      type: "positional",
      description: "Hook name, or module/hook-name to scope to a module",
      required: true,
    },
    type: {
      type: "string",
      default: "request",
      description: "Hook type request/send/transform etc.",
    },
    dir: {
      type: "string",
      description: "Root source directory",
      valueHint: "path",
      default: "src",
    },
    global: {
      type: "boolean",
      description: "Register hook via app.register() in src/index.ts instead of the nearest module",
      default: false,
    },
  },
  run: handle,
});
