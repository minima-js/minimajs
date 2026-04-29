---
title: plugin
---

# minimajs add plugin

Scaffolds a plugin file and registers it in the nearest `module.ts`.

```bash
./app add plugin <name>
```

## What it does

1. Creates a `<name>.plugin.ts` file with a typed plugin stub.
2. Patches the nearest `module.ts` to import and register the plugin in its `plugins` array.

## Generated file

```ts
import type { Plugin } from "@minimajs/server";

export const hello: Plugin = async (app) => {
  // TODO: implement plugin logic
};
```

## Placement

| Command | Plugin file | Patched file |
| ------- | ----------- | ------------ |
| `./app add plugin hello` | `src/plugins/hello.plugin.ts` | `src/module.ts` |
| `./app add plugin orders/hello` | `src/orders/hello.plugin.ts` | `src/orders/module.ts` |

When no module path is given, the file is created in `src/plugins/` and registered in the root `src/module.ts`.

## Options

| Flag    | Default | Description             |
| ------- | ------- | ----------------------- |
| `--dir` | `src`   | Root source directory   |

## Examples

```bash
# Root-level plugin → src/plugins/rate-limit.plugin.ts
./app add plugin rate-limit

# Scoped to the orders module → src/orders/audit.plugin.ts
./app add plugin orders/audit
```
