import type { Plugin, PluginBuild } from "esbuild";

function setup({ onLoad, onResolve, initialOptions }: PluginBuild): void {
  const namespace = "cjs-polyfill";
  if (!initialOptions.inject) {
    initialOptions.inject = [];
  }
  initialOptions.inject.push("cjs:virtual");
  onResolve({ filter: /^cjs:virtual$/ }, (args) => {
    return { path: args.path, namespace };
  });
  onLoad({ filter: /.*/, namespace }, () => {
    return {
      loader: "js",
      contents: `import { URL, fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
const currentModuleURL = new URL(import.meta.url);
const currentModulePath = fileURLToPath(currentModuleURL);
const currentModuleDirname = dirname(currentModulePath);
globalThis.__filename = currentModulePath;
globalThis.__dirname = currentModuleDirname;
globalThis.require = createRequire(import.meta.url);
`,
    };
  });
}

export function cjs(): Plugin {
  return {
    name: "cjs-polyfill",
    setup,
  };
}
