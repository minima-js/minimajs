---
title: hook
---

# minimajs add hook

Scaffolds a lifecycle hook file and registers it in the nearest module (or globally in `src/index.ts`).

```bash
minimajs add hook <name>
```

## What it does

1. Creates a `<name>.hook.ts` file with a typed hook stub.
2. Patches the target file to import and register the hook:
   - **Module-scoped** (default): adds the hook to the `plugins` array in the nearest `module.ts`.
   - **Global** (`--global`): adds `app.register(hookName)` in `src/index.ts` after `createApp()`.

## Generated file

```ts
import { hook } from "@minimajs/server";

export const requestLogger = hook("request", async () => {
  // TODO: implement hook logic
});
```

## Placement

| Command | Hook file | Patched file |
| ------- | --------- | ------------ |
| `minimajs add hook request-logger` | `src/hooks/request-logger.hook.ts` | `src/module.ts` |
| `minimajs add hook users/request-logger` | `src/users/request-logger.hook.ts` | `src/users/module.ts` |
| `minimajs add hook request-logger --global` | `src/hooks/request-logger.hook.ts` | `src/index.ts` |

## Options

| Flag       | Default     | Description                                                              |
| ---------- | ----------- | ------------------------------------------------------------------------ |
| `--type`   | `request`   | Hook event type (`request`, `send`, `transform`, etc.)                  |
| `--global` | `false`     | Register via `app.register()` in `src/index.ts` instead of `module.ts` |
| `--dir`    | `src`       | Root source directory                                                    |

## Examples

```bash
# Request hook scoped to src/module.ts
minimajs add hook request-logger

# Transform hook scoped to the users module
minimajs add hook users/transform-body --type=transform

# Global hook registered in src/index.ts
minimajs add hook request-logger --global

# Custom hook type, global
minimajs add hook body-sanitizer --type=transform --global
```
