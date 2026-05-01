---
title: Plugins
sidebar_position: 2
---

# CLI Plugins

Minimajs plugins extend both the **build pipeline** and the **CLI** from a single `CliPlugin` object. The same plugin can hook into esbuild, register new `./app` commands, and add `./app add` generators — there is no separate type for each concern.

Plugins are registered via a named `plugins` export in `minimajs.config.ts`, separate from `defineConfig`:

```ts
// minimajs.config.ts
import { defineConfig, definePlugins } from "@minimajs/cli";
import { queuePlugin } from "@myapp/queue-plugin";

export default defineConfig(({ dev }) => ({
  sourcemap: dev,
}));

export const plugins = definePlugins([queuePlugin()]);
```

`definePlugins` also accepts a factory that receives `{ mode, dev }`:

```ts
export const plugins = definePlugins(({ dev }) => [
  queuePlugin({ verbose: dev }),
]);
```

---

## Plugin shape — `CliPlugin`

| Field        | Type                           | Description                                         |
| ------------ | ------------------------------ | --------------------------------------------------- |
| `name`       | `string`                       | Unique plugin identifier (required)                 |
| `entry`      | `string[]`                     | Extra glob patterns added to the esbuild entry set  |
| `setup`      | `(build: PluginBuild) => void` | esbuild plugin hook — transform, intercept, resolve |
| `commands`   | `Record<string, CommandDef>`   | Root-level CLI commands added to `./app`            |
| `generators` | `Record<string, CommandDef>`   | Generators added under `./app add`                  |

All fields except `name` are optional. A plugin can use any combination.

---

## esbuild integration

### Extra entry points — `entry`

`entry` accepts glob patterns. Any matched file is added to the esbuild entry set automatically — no manual registration in `minimajs.config.ts` needed.

```ts
import type { CliPlugin } from "@minimajs/cli";

const workerPlugin = (): CliPlugin => ({
  name: "workers",
  entry: ["src/**/worker.ts"],
});
```

With this plugin, every `worker.ts` under `src/` becomes a separate build output.

### Hooking into esbuild — `setup`

`setup` gives full access to the [esbuild plugin API](https://esbuild.github.io/plugins/). Use it to transform files, resolve custom imports, or inject globals:

```ts
const workerPlugin = (): CliPlugin => ({
  name: "workers",
  entry: ["src/**/worker.ts"],
  setup(build) {
    // load .txt files as string exports
    build.onLoad({ filter: /\.txt$/ }, (args) => ({
      contents: `export default ${JSON.stringify(args.path)}`,
      loader: "js",
    }));

    // redirect imports to a polyfill
    build.onResolve({ filter: /^node-fetch$/ }, () => ({
      path: "./src/polyfills/fetch.ts",
    }));
  },
});
```

> A plugin with no `setup` is not passed to esbuild — only its `entry` patterns are applied.

---

## CLI commands — `commands`

Plugin commands appear at the **root level** of `./app`, alongside the built-in `dev`, `build`, and `start` commands. Use `defineCommand` (re-exported from `@minimajs/cli`) to define them.

```ts
import { defineCommand } from "@minimajs/cli";
import type { CliPlugin } from "@minimajs/cli";

const queuePlugin = (): CliPlugin => ({
  name: "queue",
  commands: {
    queue: defineCommand({
      meta: { description: "Manage the job queue" },
      subCommands: {
        flush: defineCommand({
          meta: { description: "Flush all pending jobs" },
          async run() {
            console.log("Flushing queue…");
          },
        }),
        stats: defineCommand({
          meta: { description: "Print queue statistics" },
          async run() {
            console.log("Queue stats…");
          },
        }),
      },
    }),
  },
});
```

With this plugin registered:

```sh
./app queue flush
./app queue stats
```

### Commands with arguments and options

```ts
const deployPlugin = (): CliPlugin => ({
  name: "deploy",
  commands: {
    deploy: defineCommand({
      meta: { description: "Deploy the application" },
      args: {
        env: {
          type: "positional",
          description: "Target environment",
          valueHint: "production|staging",
        },
        dry: {
          type: "boolean",
          description: "Preview without deploying",
        },
      },
      async run({ args }) {
        if (args.dry) {
          console.log(`[dry-run] deploy → ${args.env}`);
          return;
        }
        // deploy…
      },
    }),
  },
});
```

```sh
./app deploy production
./app deploy staging --dry
```

---

## CLI generators — `generators`

Generators appear under `./app add <name>`. They follow the same citty command shape as regular commands.

```ts
const queuePlugin = (): CliPlugin => ({
  name: "queue",
  generators: {
    job: defineCommand({
      meta: { description: "Scaffold a new queue job" },
      args: {
        name: {
          type: "positional",
          description: "Job name",
          valueHint: "send-email",
        },
        queue: {
          type: "string",
          description: "Target queue name",
          default: "default",
        },
      },
      async run({ args }) {
        // scaffold src/jobs/<args.name>.job.ts
        console.log(`Scaffolding job: ${args.name} on queue "${args.queue}"`);
      },
    }),
  },
});
```

```sh
./app add job send-email
./app add job process-payment --queue payments
```

---

## A plugin with everything

The same plugin can combine all four fields:

```ts
const queuePlugin = (): CliPlugin => ({
  name: "queue",

  // esbuild: include job files automatically
  entry: ["src/**/jobs/*.ts"],

  // esbuild: transform job files
  setup(build) {
    build.onLoad({ filter: /\.job\.ts$/ }, async (args) => {
      // inject queue metadata
    });
  },

  // CLI: ./app queue flush | stats
  commands: {
    queue: defineCommand({
      meta: { description: "Manage the job queue" },
      subCommands: {
        flush: defineCommand({ async run() { /* … */ } }),
        stats: defineCommand({ async run() { /* … */ } }),
      },
    }),
  },

  // CLI: ./app add job <name>
  generators: {
    job: defineCommand({
      args: { name: { type: "positional" } },
      async run({ args }) { /* scaffold */ },
    }),
  },
});
```

---

## Publishing a plugin

A plugin package should import `defineCommand` and `CliPlugin` directly from `@minimajs/cli` to avoid type mismatches between versions:

```ts
// my-plugin/src/index.ts
import { defineCommand } from "@minimajs/cli";
import type { CliPlugin } from "@minimajs/cli";

export interface MyPluginOptions {
  verbose?: boolean;
}

export const myPlugin = (options: MyPluginOptions = {}): CliPlugin => ({
  name: "my-plugin",
  entry: ["src/**/worker.ts"],
  setup(build) { /* … */ },
  commands: {
    my: defineCommand({
      meta: { description: "My plugin commands" },
      subCommands: { /* … */ },
    }),
  },
  generators: {
    worker: defineCommand({
      meta: { description: "Scaffold a worker" },
      args: { name: { type: "positional" } },
      async run({ args }) { /* … */ },
    }),
  },
});
```

Consumers install the package and register it:

```ts
// minimajs.config.ts
import { defineConfig, definePlugins } from "@minimajs/cli";
import { myPlugin } from "my-plugin";

export default defineConfig(({ dev }) => ({ sourcemap: dev }));

export const plugins = definePlugins(({ dev }) => [
  myPlugin({ verbose: dev }),
]);
```

Add `@minimajs/cli` as a peer dependency in your plugin's `package.json`:

```json
{
  "peerDependencies": {
    "@minimajs/cli": ">=0.1.0"
  }
}
```
