export interface Integration {
  name: string;
  description: string;
  packages: string[];
  files: Array<{ path: string; content: string }>;
  /** Patch src/module.ts to register this integration as a plugin */
  modulePatch?: {
    /** Import line to prepend, e.g. `import { openapi } from "@minimajs/openapi";` */
    importLine: string;
    /** Plugin expression to add to the plugins array, e.g. `openapi(...)` */
    plugin: string;
  };
}
