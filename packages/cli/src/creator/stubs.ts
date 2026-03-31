import type { Runtime, PackageManager } from "../config/types.js";
import indexStub from "./templates/index.stub";
import rootModuleStub from "./templates/root-module.stub";
import minimaJsConfigStub from "./templates/minimajs.config.stub";
import tsconfigStub from "./templates/tsconfig.stub";
import packageNodeStub from "./templates/package.node.stub";
import packageBunStub from "./templates/package.bun.stub";
import gitignoreStub from "./templates/gitignore.stub";
import envStub from "./templates/env.stub";

export function renderIndex(runtime: Runtime): string {
  return indexStub({ runtime });
}

export function renderRootModule(): string {
  return rootModuleStub({});
}

export function renderMinimaJsConfig(runtime: Runtime, packageManager: PackageManager): string {
  return minimaJsConfigStub({ runtime, packageManager });
}

export function renderTsConfig(): string {
  return tsconfigStub({});
}

export function renderPackageJson(name: string, runtime: Runtime): string {
  return (runtime === "bun" ? packageBunStub : packageNodeStub)({ name });
}

export function renderGitignore(): string {
  return gitignoreStub({});
}

export function renderEnv(): string {
  return envStub({});
}
