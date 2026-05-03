import { defineCommand, runMain, type CommandDef } from "citty";
import { newCommand } from "./creator/index.js";
import { devCommand } from "./compiler/dev.js";
import { buildCommand } from "./compiler/build.js";
import { startCommand } from "./compiler/start.js";
import { buildAddCommand } from "./generator/index.js";
import { checkCommand } from "./check/index.js";
import { infoCommand } from "./info/index.js";
import { initCommand } from "./init/index.js";
import { syncCommand } from "./installer/sync.js";
import { upgradeCommand } from "./installer/upgrade.js";
import { runtime } from "./runtime/index.js";
import { pkgm } from "./pkgm/index.js";
import { loadPlugins } from "./config/index.js";
import type { ConfigMode } from "./config/types.js";
import pkg from "../package.json" with { type: "json" };

export type { CliOption } from "./config/types.js";

function modeFromArgv(): ConfigMode {
  const arg = process.argv[2];
  if (arg === "dev") return "dev";
  if (arg === "build") return "build";
  return "start";
}

export async function run(): Promise<void> {
  const { name: rt, version: rtVersion } = runtime.resolve();
  const pm = pkgm();
  const pmVersion = pkgm.version(pm) ?? "";
  const pmLabel = pm === "yarn" && pkgm.isYarnBerry() ? "yarn (berry)" : pm;

  const rtLine = `  Runtime:         ${rt} ${rtVersion}`;
  const pmLine = `  Package manager: ${pmLabel} ${pmVersion}`;

  const mode = modeFromArgv();
  const plugins = await loadPlugins({ mode, dev: mode === "dev" });

  const pluginCommands = Object.fromEntries(
    plugins.flatMap((p) => Object.entries((p.commands ?? {}) as Record<string, CommandDef<any>>))
  );
  const pluginGenerators = Object.fromEntries(
    plugins.flatMap((p) => Object.entries((p.generators ?? {}) as Record<string, CommandDef<any>>))
  );

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
      add: buildAddCommand(pluginGenerators),
      check: checkCommand,
      info: infoCommand,
      sync: syncCommand,
      upgrade: upgradeCommand,
      ...pluginCommands,
    },
  });

  return runMain(main);
}
