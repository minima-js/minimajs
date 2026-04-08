import appBunStub from "./app.bun.stub";
import appNodeStub from "./app.node.stub";
import envStub from "./env.stub";
import gitignoreStub from "./gitignore.stub";
import indexStub from "./index.ts.stub";
import minimaJsConfigStub from "./minimajs.config.stub";
import packageBunStub from "./package.bun.json.stub";
import packageNodeStub from "./package.node.json.stub";
import rootModuleStub from "./module.ts.stub";
import tsconfigStub from "./tsconfig.stub.json" with { type: "json" };

export const templates = {
  appBun: appBunStub,
  appNode: appNodeStub,
  env: envStub,
  gitignore: gitignoreStub,
  index: indexStub,
  minimaJsConfig: minimaJsConfigStub,
  packageBun: packageBunStub,
  packageNode: packageNodeStub,
  rootModule: rootModuleStub,
  tsconfig: () => JSON.stringify(tsconfigStub, null, 2),
};
