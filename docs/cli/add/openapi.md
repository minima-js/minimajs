---
title: openapi
---

# minimajs add openapi

Installs `@minimajs/openapi` and registers the plugin in `src/module.ts`, exposing a JSON spec at `/openapi.json`.

```bash
minimajs add openapi
```

## What it does

- Installs `@minimajs/openapi`
- Patches `src/module.ts` to add the import and register the plugin:

```ts
import { openapi } from "@minimajs/openapi";

export const meta: Meta = {
  plugins: [openapi({ info: { title: "My API", version: "1.0.0" } })],
};
```

Running the command again is safe — it skips if the import already exists.

## Options

| Flag           | Default | Description                  |
| -------------- | ------- | ---------------------------- |
| `--no-install` | —       | Skip dependency installation |

## Examples

```bash
minimajs add openapi

# Skip install (if already installed)
minimajs add openapi --no-install
```
