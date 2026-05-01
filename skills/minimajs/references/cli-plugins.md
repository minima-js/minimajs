# CLI Plugins reference

Plugins are registered via a named `plugins` export in `minimajs.config.ts`, separate from `defineConfig`. The same `CliPlugin` covers esbuild pipeline hooks and CLI extensions — any combination of fields is valid.

```ts
// minimajs.config.ts
import { defineConfig, definePlugins } from "@minimajs/cli";
import { myPlugin } from "my-plugin";

export default defineConfig(({ dev }) => ({ sourcemap: dev }));

// static
export const plugins = definePlugins([myPlugin()]);

// factory — receives { mode, dev }
export const plugins = definePlugins(({ dev }) => [myPlugin({ verbose: dev })]);
```

---

## CliPlugin fields

| Field        | Type                           | Purpose                                             |
| ------------ | ------------------------------ | --------------------------------------------------- |
| `name`       | `string`                       | Required. Unique plugin identifier                  |
| `entry`      | `string[]`                     | Glob patterns added to the esbuild entry set        |
| `setup`      | `(build: PluginBuild) => void` | esbuild plugin hook — transform, resolve, intercept |
| `commands`   | `Record<string, CommandDef>`   | Root-level `./app` commands                         |
| `generators` | `Record<string, CommandDef>`   | `./app add <name>` generators                       |

---

## esbuild: `entry` + `setup`

`entry` globs are merged into the build entry set. `setup` is the full esbuild plugin API:

```ts
const workerPlugin = (): CliPlugin => ({
  name: "workers",
  entry: ["src/**/worker.ts"],
  setup(build) {
    build.onLoad({ filter: /\.txt$/ }, (args) => ({
      contents: `export default ${JSON.stringify(args.path)}`,
      loader: "js",
    }));
  },
});
```

A plugin with no `setup` is not passed to esbuild — only `entry` patterns are applied.

---

## CLI commands

Root-level commands appear alongside `dev`, `build`, `start`:

```ts
import { defineCommand } from "@minimajs/cli";

const queuePlugin = (): CliPlugin => ({
  name: "queue",
  commands: {
    queue: defineCommand({
      meta: { description: "Manage the job queue" },
      args: {
        env: { type: "string", default: "default" },
      },
      subCommands: {
        flush: defineCommand({
          async run() { /* … */ },
        }),
        stats: defineCommand({
          async run() { /* … */ },
        }),
      },
    }),
  },
});
```

```sh
./app queue flush
./app queue stats --env production
```

---

## CLI generators

Generators appear under `./app add`:

```ts
const queuePlugin = (): CliPlugin => ({
  name: "queue",
  generators: {
    job: defineCommand({
      meta: { description: "Scaffold a queue job" },
      args: {
        name: { type: "positional", valueHint: "send-email" },
        queue: { type: "string", default: "default" },
      },
      async run({ args }) {
        // scaffold src/jobs/<args.name>.job.ts
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

## Full plugin example

```ts
import { defineCommand } from "@minimajs/cli";
import type { CliPlugin } from "@minimajs/cli";

export const queuePlugin = (): CliPlugin => ({
  name: "queue",
  entry: ["src/**/jobs/*.ts"],
  setup(build) {
    build.onLoad({ filter: /\.job\.ts$/ }, async (args) => { /* inject metadata */ });
  },
  commands: {
    queue: defineCommand({
      meta: { description: "Manage the job queue" },
      subCommands: {
        flush: defineCommand({ async run() { /* … */ } }),
        stats: defineCommand({ async run() { /* … */ } }),
      },
    }),
  },
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

- Import `defineCommand` and `CliPlugin` from `@minimajs/cli` directly (avoids type mismatches)
- Declare `@minimajs/cli` as a peer dependency

```ts
// my-plugin/src/index.ts
import { defineCommand } from "@minimajs/cli";
import type { CliPlugin } from "@minimajs/cli";

export const myPlugin = (opts: { verbose?: boolean } = {}): CliPlugin => ({
  name: "my-plugin",
  entry: ["src/**/worker.ts"],
  commands: { my: defineCommand({ /* … */ }) },
  generators: { worker: defineCommand({ /* … */ }) },
});
```

```json
// package.json
{ "peerDependencies": { "@minimajs/cli": ">=0.1.0" } }
```
