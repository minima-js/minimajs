import { defineCommand } from "citty";
import { generateModule } from "../generator/index.js";
import { addIntegration, addDockerfile, integrations } from "./index.js";
import { generateFile, type GeneratorType } from "./generators.js";

function makeGeneratorCommand(type: GeneratorType, description: string) {
  return defineCommand({
    meta: { name: type, description },
    args: {
      name: {
        type: "positional",
        description: `Name or path (e.g. users or api/users)`,
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
      generateFile(type, args.name, args.dir);
    },
  });
}

function makeIntegrationCommand(name: string, description: string) {
  return defineCommand({
    meta: { name, description },
    args: {
      description: {
        type: "string",
        alias: ["d"],
        description: "Optional hint / description",
        required: false,
      },
    },
    run({ args }) {
      addIntegration(name, { description: args.description });
    },
  });
}

export const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Scaffold modules, services, middleware and install integrations",
  },
  subCommands: {
    module: defineCommand({
      meta: { name: "module", description: "Scaffold a new route module" },
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
        generateModule({ name: args.name, dir: args.dir });
      },
    }),
    service: makeGeneratorCommand("service", "Scaffold a service (module functions)"),
    middleware: makeGeneratorCommand("middleware", "Scaffold a middleware plugin"),
    plugin: makeGeneratorCommand("plugin", "Scaffold a reusable plugin"),
    hook: makeGeneratorCommand("hook", "Scaffold a lifecycle hook"),
    job: makeGeneratorCommand("job", "Scaffold a background job"),
    cron: makeGeneratorCommand("cron", "Scaffold a scheduled task"),
    event: makeGeneratorCommand("event", "Scaffold an event handler"),
    dockerfile: defineCommand({
      meta: { name: "dockerfile", description: "Generate a Dockerfile (auto-detects bun or node runtime)" },
      run() {
        addDockerfile();
      },
    }),
    ...Object.fromEntries(
      Object.entries(integrations).map(([key, integration]) => [
        key,
        makeIntegrationCommand(key, `Install ${integration.description.toLowerCase()}`),
      ])
    ),
  },
});
