import { defineCommand } from "citty";
import { generateModule } from "./index.js";

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
        generateModule({ name: args.name, dir: args.dir });
      },
    }),
  },
});
