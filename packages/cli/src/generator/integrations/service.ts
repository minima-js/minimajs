import { defineCommand } from "citty";
import { generateFile } from "../generators.js";

function handle({ args }: { args: { name: string; dir: string } }) {
  generateFile("service", args.name, args.dir);
}

export const service = defineCommand({
  meta: { name: "service", description: "Scaffold a service" },
  args: {
    name: { type: "positional", description: "Name or path (e.g. users or api/users)", required: true },
    dir: { type: "string", description: "Root source directory", valueHint: "path", default: "src" },
  },
  run: handle,
});
