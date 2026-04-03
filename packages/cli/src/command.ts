import { defineCommand, runMain } from "citty";
import { newCommand } from "./creator/command.js";
import { devCommand, buildCommand, startCommand } from "./compiler/command.js";
import { addCommand } from "./generator/command.js";
import { checkCommand } from "./check/command.js";
import { infoCommand } from "./info/command.js";
import pkg from "../package.json" with { type: "json" };

export type { CliOption } from "./config/types.js";

const main = defineCommand({
  meta: {
    name: "minimajs",
    version: pkg.version,
    description: "CLI for MinimaJS — scaffold, develop, build and manage your app",
  },
  subCommands: {
    new: newCommand,
    dev: devCommand,
    build: buildCommand,
    start: startCommand,
    add: addCommand,
    check: checkCommand,
    info: infoCommand,
  },
});

export function run(): void {
  runMain(main);
}
