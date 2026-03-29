import { defineCommand, runMain } from "citty";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { newCommand } from "./creator/command.js";
import { devCommand, buildCommand, startCommand } from "./compiler/command.js";
import { generateCommand } from "./generator/command.js";

export type { CliOption } from "./config/types.js";

const pkgPath = join(fileURLToPath(import.meta.url), "../../package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

const main = defineCommand({
  meta: {
    name: "minimajs",
    version,
    description: "CLI for MinimaJS — scaffold, develop, build and manage your app",
  },
  subCommands: {
    new: newCommand,
    dev: devCommand,
    build: buildCommand,
    start: startCommand,
    generate: generateCommand,
    g: generateCommand,
  },
});

export function run(): void {
  runMain(main);
}
