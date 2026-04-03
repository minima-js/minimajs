import { defineCommand } from "citty";
import { generateFile } from "../generators.js";

function handle({ args }: { args: { name: string; dir: string } }) {
  generateFile("plugin", args.name, args.dir);
}

export const plugin = defineCommand({
  meta: { name: "plugin", description: "Scaffold a reusable plugin" },
  args: {
    name: { type: "positional", description: "Name or path (e.g. users or api/users)", required: true },
    dir: { type: "string", description: "Root source directory", valueHint: "path", default: "src" },
  },
  run: handle,
});
