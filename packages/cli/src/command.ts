import { defineCommand, runMain } from "citty";
import { newCommand } from "./creator/command.js";
import { devCommand } from "./compiler/dev.js";
import { buildCommand } from "./compiler/build.js";
import { startCommand } from "./compiler/start.js";
import { addCommand } from "./generator/command.js";
import { checkCommand } from "./check/command.js";
import { infoCommand } from "./info/command.js";
import { initCommand } from "./init/command.js";
import { runtime } from "./runtime/index.js";
import { detect as detectPM, isYarnBerry, getVersion } from "./pm/index.js";
import pkg from "../package.json" with { type: "json" };

export type { CliOption } from "./config/types.js";

const rt = runtime();
const rtVersion = runtime.version();
const pm = detectPM();
const pmVersion = getVersion(pm)?.split("@")[1] ?? "";
const pmLabel = pm === "yarn" && isYarnBerry() ? "yarn (berry)" : pm;

const rtLine = `  Runtime:         ${rt} ${rtVersion}`;
const pmLine = `  Package manager: ${pmLabel} ${pmVersion}`;

const main = defineCommand({
  meta: {
    name: "minimajs",
    version: pkg.version,
    description: `CLI for MinimaJS — scaffold, develop, build and manage your app\n\n${rtLine}\n${pmLine}\n\n`,
  },
  subCommands: {
    new: newCommand,
    init: initCommand,
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
