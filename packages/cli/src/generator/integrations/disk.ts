import type { Integration } from "./types.js";

export const disk: Integration = {
  name: "disk",
  description: "Disk file storage",
  packages: ["@minimajs/disk"],
  files: [
    {
      path: "src/disk.ts",
      content: `import { createDisk } from "@minimajs/disk";
export const disk = createDisk();
`,
    },
  ],
};
