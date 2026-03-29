import { defineCommand } from "citty";
import { createProject, detectPackageManager, detectRuntime, type PackageManager, type Runtime } from "./index.js";

export const newCommand = defineCommand({
  meta: {
    name: "new",
    description: "Scaffold a new MinimaJS application",
  },
  args: {
    name: {
      type: "positional",
      description: "Project name / directory",
      required: true,
    },
    pm: {
      type: "string",
      description: "Package manager to use",
      valueHint: "bun|pnpm|yarn|npm",
    },
    runtime: {
      type: "string",
      description: "Runtime target",
      valueHint: "node|bun",
    },
    "skip-install": {
      type: "boolean",
      description: "Skip dependency installation",
    },
    git: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip git init",
    },
  },
  run({ args }) {
    createProject({
      name: args.name,
      pm: (args.pm as PackageManager) ?? detectPackageManager(),
      runtime: (args.runtime as Runtime) ?? detectRuntime(),
      skipInstall: args["skip-install"],
      git: args.git,
    });
  },
});
