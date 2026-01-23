---
title: Module Discovery Configuration
sidebar_position: 3
---

# Module Discovery Configuration

This guide covers advanced configuration for Minima.js module discovery. Use it when you need custom file names, a non-standard directory structure, or a custom scanner.

## Default Behavior

By default, Minima.js:

- Scans the directory of your entry file
- Looks for `module.{ts,js,mjs}` files
- Treats a `module.ts` in the root as the **root module**

```typescript
// src/index.ts
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // defaults: root = entry dir, index = "module"

await app.listen({ port: 3000 });
```

## Configuration Options

Configure discovery via `createApp({ moduleDiscovery: { ... } })`.

### `index` (filename)

Use a different filename instead of `module.ts`.

```typescript
// src/index.ts
import { createApp } from "@minimajs/server/bun";

const app = createApp({
  moduleDiscovery: {
    index: "route", // looks for route.ts
  },
});
```

**Resulting pattern:** `**/route.{ts,js,mjs}`

```text
src/
├── index.ts
├── users/
│   └── route.ts
└── posts/
    └── route.ts
```

### `root` (directory)

Scan a specific directory instead of the entry file folder.

```typescript
// src/index.ts
import { createApp } from "@minimajs/server/bun";
import path from "node:path";

const app = createApp({
  moduleDiscovery: {
    root: path.resolve(import.meta.dir, "features"),
  },
});
```

**Resulting pattern:** `features/**/module.{ts,js,mjs}`

```text
src/
├── index.ts
└── features/
    ├── users/
    │   └── module.ts
    └── posts/
        └── module.ts
```

> **Important:** `moduleDiscovery.root` must be an **absolute path**. Use `path.resolve()`.

### Combine `root` + `index`

```typescript
// src/index.ts
import { createApp } from "@minimajs/server/bun";
import path from "node:path";

const app = createApp({
  moduleDiscovery: {
    root: path.resolve(import.meta.dir, "app"),
    index: "route",
  },
});
```

**Resulting pattern:** `app/**/route.{ts,js,mjs}`

## Custom Scanner

You can provide a custom scanner to control how modules are discovered.

```typescript
// src/index.ts
import { createApp, type ModuleScanner } from "@minimajs/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

const scanner: ModuleScanner = async function* scan(dir, index) {
  // Example: only scan one level deep
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, `${index}.ts`);
    yield file;
  }
};

const app = createApp({
  moduleDiscovery: {
    scanner,
  },
});
```

Use a custom scanner if you need:

- Non-standard folder layouts
- Filters based on naming conventions
- External module sources

## Disabling Module Discovery

If you want to register everything manually:

```typescript
const app = createApp({
  moduleDiscovery: false,
});
```

## Troubleshooting

**Modules not discovered? Check:**

1. ✅ Is the filename correct? (`module.ts` by default)
2. ✅ Is `moduleDiscovery` enabled? (it is by default)
3. ✅ Is the root path absolute?
4. ✅ Is the file inside the discovery root?

## Related Docs

- [Modules Tutorial](/core-concepts/modules)
- [Plugins](/core-concepts/plugins)
