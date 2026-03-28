import { defineCommand } from "citty";
import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { moduleTs } from "../templates/module.js";
import { green, bold, cyan, dim } from "../utils/colors.js";

export const generateCommand = defineCommand({
  meta: {
    name: "generate",
    description: "Generate MinimaJS building blocks",
  },
  subCommands: {
    module: defineCommand({
      meta: {
        name: "module",
        description: "Generate a new route module",
      },
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
      run({ args }) {
        const modulePath = resolve(args.dir, args.name);
        const moduleName = args.name.split("/").at(-1) ?? args.name;

        if (existsSync(join(modulePath, "module.ts"))) {
          process.stderr.write(`Module ${bold(args.name)} already exists at ${cyan(modulePath)}\n`);
          process.exit(1);
        }

        mkdirSync(modulePath, { recursive: true });
        writeFileSync(join(modulePath, "module.ts"), moduleTs(moduleName), "utf8");

        process.stdout.write(
          [
            "",
            `  ${green("✔")} Generated module ${bold(cyan(args.name))}`,
            "",
            `  ${dim("Created:")}`,
            `    ${cyan(join(args.dir, args.name, "module.ts"))}`,
            "",
          ].join("\n")
        );
      },
    }),
  },
});
