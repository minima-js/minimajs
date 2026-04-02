import type { Integration } from "./types.js";

export const openapi: Integration = {
  name: "openapi",
  description: "OpenAPI/Swagger documentation",
  packages: ["@minimajs/openapi"],
  files: [],
  modulePatch: {
    importLine: `import { openapi } from "@minimajs/openapi";`,
    plugin: `openapi({ info: { title: "My API", version: "1.0.0" } })`,
  },
};
