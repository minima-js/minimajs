import { defineCommand } from "citty";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { exists, text, mkdir } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { integrateOpenapi } from "./openapi.js";
import { templates } from "../templates/index.js";

interface SwaggerArgs {
  path: string;
  spec: string;
  install: boolean;
}

function handle({ args }: { args: SwaggerArgs }) {
  const cwd = process.cwd();
  const moduleDir = resolve(cwd, "src", args.path);
  const moduleFile = join(moduleDir, "module.ts");

  if (exists(moduleFile)) {
    logger.fatal(`Swagger UI already exists at ${chalk.cyan(moduleFile)}`);
  }

  integrateOpenapi(cwd, args.install);

  mkdir.sync(moduleDir);
  text.write.sync(moduleFile, templates.swaggerModule({ spec: args.spec }));

  logger.info(
    "",
    `  ${chalk.green("✔")} Created Swagger UI at ${chalk.bold(chalk.cyan(`/${args.path}`))}`,
    "",
    `  ${chalk.dim("Created:")} ${chalk.cyan(moduleFile)}`,
    `  ${chalk.dim("Spec:")}    ${chalk.cyan(args.spec)}`,
    `  ${chalk.dim("View:")}    ${chalk.cyan(`http://localhost:3000/${args.path}`)}`,
    ""
  );
}

export const swagger = defineCommand({
  meta: { name: "swagger", description: "Add Swagger UI (auto-configures openapi if needed)" },
  args: {
    path: {
      type: "string",
      description: "URL path and directory name for Swagger UI",
      default: "docs",
    },
    spec: {
      type: "string",
      description: "URL of the OpenAPI JSON spec",
      default: "/openapi.json",
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
  },
  run: handle,
});
