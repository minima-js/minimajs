import type { Integration } from "./types.js";

export const cache: Integration = {
  name: "cache",
  description: "Cache layer",
  packages: ["@minimajs/cache"],
  files: [
    {
      path: "src/cache.ts",
      content: `import { createCache } from "@minimajs/cache";

export const cache = createCache({
  driver: "memory",
});
`,
    },
  ],
};
