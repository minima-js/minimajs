import { defineCommand } from "citty";
import { generateFile } from "../generators.js";

function handle({ args }: { args: { name: string; dir: string } }) {
  return generateFile("hook", args.name, args.dir);
}

export const hook = defineCommand({
  meta: { name: "hook", description: "Scaffold a lifecycle hook" },
  args: {
    name: { type: "positional", description: "Name or path (e.g. users or api/users)", required: true },
    dir: { type: "string", description: "Root source directory", valueHint: "path", default: "src" },
  },
  run: handle,
});
