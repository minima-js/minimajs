import type { Integration } from "./types.js";

export const queue: Integration = {
  name: "queue",
  description: "Background job queue",
  packages: ["@minimajs/queue"],
  files: [
    {
      path: "src/queue.ts",
      content: `import { createQueue } from "@minimajs/queue";

export const queue = createQueue({
  driver: "memory",
});
`,
    },
  ],
};
