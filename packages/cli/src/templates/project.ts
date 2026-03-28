import type { PackageJson } from "../types.js";

export function projectPackageJson(name: string): PackageJson {
  return {
    name,
    version: "0.1.0",
    type: "module",
    private: true,
    scripts: {
      dev: "minimajs dev src/index.ts",
      build: "minimajs build src/index.ts",
      start: "minimajs start",
    },
    dependencies: {
      "@minimajs/server": "latest",
    },
    devDependencies: {
      "@types/node": "^22.0.0",
      typescript: "^5.9.0",
    },
    engines: {
      node: ">=18.17.0",
    },
  };
}

export const tsConfig = {
  compilerOptions: {
    target: "ESNext",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    lib: ["ESNext"],
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    outDir: "./dist",
    rootDir: "./src",
    resolveJsonModule: true,
  },
  include: ["src"],
};

export function indexTs(runtime: "node" | "bun"): string {
  return `import { createApp } from "@minimajs/server/${runtime}";
import { logger } from "@minimajs/server/${runtime}";

const app = createApp();
const addr = await app.listen({ port: 3000 });
logger.info("Listening on %s", addr);
`;
}

export const rootModuleTs = `import type { Meta } from "@minimajs/server";

export const meta: Meta = {
  prefix: "/api",
  plugins: [],
};
`;
