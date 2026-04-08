import appBun from "./app.bun.stub";
import appNode from "./app.node.stub";
import env from "./env.stub";
import gitignore from "./gitignore.stub";
import index from "./index.ts.stub";
import minimajsConfig from "./minimajs.config.stub";
import packageBun from "./package.bun.json.stub";
import packageNode from "./package.node.json.stub";
import rootModule from "./module.ts.stub";
import tsconfig from "./tsconfig.stub.json" with { type: "json" };

import type { Stub } from "../../types.js";

export const templates = {
  app: {
    bun: appBun as Stub,
    node: appNode as Stub<{ exec: string }>,
  },
  package: {
    bun: packageBun as Stub<{ name: string; packageManager: string }>,
    node: packageNode as Stub<{ name: string; packageManager: string }>,
  },
  env: env as Stub,
  gitignore: gitignore as Stub,
  index: index as Stub<{ runtime: string }>,
  minimajsConfig: minimajsConfig as Stub<{ runtime: string }>,
  rootModule: rootModule as Stub,
  tsconfig: () => JSON.stringify(tsconfig, null, 2),
};
