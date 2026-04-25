---
title: swagger
---

# minimajs add swagger

Adds a Swagger UI page to your project. If `openapi` is not yet configured, it installs and registers it automatically.

```bash
minimajs add swagger
```

## What it does

1. Checks whether `@minimajs/openapi` is registered in `src/module.ts`. If not, installs and registers it (same as `minimajs add openapi`).
2. Creates `src/docs/module.ts` (or `src/<path>/module.ts`) with an embedded Swagger UI HTML page pointing at the OpenAPI JSON spec.

The generated module is auto-discovered by the framework and mounted at `/<path>`.

## Generated file

`src/docs/module.ts`:

```ts
import { response, type Routes } from "@minimajs/server";

const html = /* html */`...Swagger UI HTML...`;

export const routes: Routes = {
  "GET /": () => response(html, { headers: { "content-type": "text/html; charset=utf-8" } }),
};
```

## Options

| Flag           | Default         | Description                                     |
| -------------- | --------------- | ----------------------------------------------- |
| `--path`       | `docs`          | URL path and directory name for Swagger UI      |
| `--spec`       | `/openapi.json` | URL of the OpenAPI JSON spec                    |
| `--no-install` | —               | Skip dependency installation                    |

## Examples

```bash
# Default: served at /docs, spec at /openapi.json
minimajs add swagger

# Custom path
minimajs add swagger --path=api-docs

# Custom spec URL (if you changed openapi's default path)
minimajs add swagger --spec=/api/openapi.json

# Skip install
minimajs add swagger --no-install
```
