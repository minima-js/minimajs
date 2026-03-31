import { defineCommand } from "citty";
import { runCheck } from "./index.js";

export const checkCommand = defineCommand({
  meta: {
    name: "check",
    description: "Run TypeScript type checking without building",
  },
  args: {
    tsconfig: {
      type: "string",
      description: "Path to tsconfig.json",
      valueHint: "path",
      default: "tsconfig.json",
    },
  },
  async run({ args }) {
    await runCheck(args.tsconfig);
  },
});
