import { defineCommand } from "citty";
import { printInfo } from "./index.js";

export const infoCommand = defineCommand({
  meta: {
    name: "info",
    description: "Show project configuration and discovered modules",
  },
  async run() {
    await printInfo();
  },
});
