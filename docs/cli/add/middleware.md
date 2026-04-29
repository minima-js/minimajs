---
title: middleware
---

# minimajs add middleware

Scaffolds a middleware file and registers it in the root `src/module.ts`.

```bash
./app add middleware <name>
```

Middleware is always global — it always registers in the root module regardless of any path prefix given.

## What it does

1. Creates a `<name>.middleware.ts` file with a middleware stub.
2. Patches `src/module.ts` to import and register the middleware in its `plugins` array.

## Generated file

```ts
import { middleware } from "@minimajs/server";

export const request = middleware(async (ctx, next) => {
  const start = Date.now();
  const response = await next();
  console.log(`Request took ${Date.now() - start}ms`);
  return response;
});
```

Export name is the camelCase of `<name>` — no `Middleware` suffix since the filename and folder already provide context.

## Placement

| Command | Middleware file | Patched file |
| ------- | --------------- | ------------ |
| `./app add middleware request` | `src/middlewares/request.middleware.ts` | `src/module.ts` |
| `./app add middleware auth/jwt` | `src/auth/jwt.middleware.ts` | `src/module.ts` |

When no path prefix is given, the file is placed in `src/middlewares/`. When a prefix is given, it is treated as a folder path — not a module path — and `src/module.ts` is always patched.

## Options

| Flag    | Default | Description           |
| ------- | ------- | --------------------- |
| `--dir` | `src`   | Root source directory |

## Examples

```bash
# src/middlewares/request.middleware.ts → registered in src/module.ts
./app add middleware request

# src/auth/jwt.middleware.ts → registered in src/module.ts
./app add middleware auth/jwt
```
