# @minimajs/server

A modern, high-performance HTTP framework for Node.js and Bun — combining proven routing and lifecycle libraries with a clean, TypeScript-first API built around file-based modules and Web standards.

[![npm version](https://img.shields.io/npm/v/@minimajs/server.svg)](https://www.npmjs.com/package/@minimajs/server)
[![License](https://img.shields.io/npm/l/@minimajs/server.svg)](https://github.com/minima-js/minimajs/blob/main/LICENSE)

## Highlights

- **File-Based Modules** — Create `users/module.ts`, it auto-loads as `/users/*`. Each module is fully encapsulated.
- **Dual Runtime** — Native integration with Bun and Node.js, one import path away from each other.
- **Web Standards First** — Uses `Request`, `Response`, `File`, `Blob`, and `ReadableStream` throughout.
- **Context Everywhere** — Access params, body, headers from any function via `AsyncLocalStorage`.
- **Zero-Config CLI** — `./app dev`, `./app build`, `./app add module` — everything in one script, built on esbuild for near-instant builds and the best DX.

---

## Quick Start

The fastest way to get started is with the CLI:

```bash
# Node.js
npx @minimajs/cli new my-app

# Bun
bunx @minimajs/cli new my-app
```

Then:

```bash
cd my-app
./app dev
```

That's it — TypeScript, file-based routing, and a live dev server.

---

## File-Based Modules

Modules are auto-discovered from your `src/` directory. Create a `module.ts` file anywhere and it becomes a route scope.

```
src/
├── index.ts           # entry point
├── module.ts          # root module (prefix, global plugins)
├── users/
│   ├── module.ts      # auto-loaded as /users/*
│   └── users.handler.ts
└── posts/
    ├── module.ts      # auto-loaded as /posts/*
    └── posts.handler.ts
```

**`src/index.ts`**

```typescript
import { logger } from "@minimajs/server";
import { createApp } from "@minimajs/server/node";
// import { createApp } from "@minimajs/server/bun"; // for Bun

const app = createApp();
const addr = await app.listen({ port: Number(process.env.PORT) });
logger.info("Listening on %s", addr);
```

**`src/module.ts`** — root module, applies to every route

```typescript
import type { Meta, Routes } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

export const meta: Meta = {
  prefix: "/api",
  plugins: [cors()],
};

function health() {
  return { status: "ok" };
}

export const routes: Routes = {
  "GET /_health": health,
};
```

**`src/users/module.ts`**

```typescript
import type { Meta, Routes } from "@minimajs/server";
import * as handlers from "./users.handler.js";

export const meta: Meta = {};

export const routes: Routes = {
  "GET /": handlers.list,
  "GET /:id": handlers.show,
  "POST /": handlers.create,
  "PUT /:id": handlers.update,
  "DELETE /:id": handlers.destroy,
};
```

**`src/users/users.handler.ts`**

```typescript
import { abort, body, params, response } from "@minimajs/server";

export interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [];
let nextId = 1;

export function list() {
  return { data: users };
}

export function show() {
  const id = params.get("id", Number);
  const user = users.find((u) => u.id === id);
  if (!user) abort.notFound();
  return user;
}

export function create() {
  const data = body<Omit<User, "id">>();
  const user: User = { id: nextId++, ...data };
  users.push(user);
  response.status("CREATED");
  return user;
}

export function update() {
  const id = params.get("id", Number);
  const data = body<Partial<User>>();
  const user = users.find((u) => u.id === id);
  if (!user) abort.notFound();
  Object.assign(user, data);
  return user;
}

export function destroy() {
  const id = params.get("id", Number);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) abort.notFound();
  users.splice(idx, 1);
  response.status("NO_CONTENT");
}
```

---

## Context Functions

Access request data from anywhere — no `req`/`res` prop drilling.

```typescript
import { params, body, headers, searchParams, abort } from "@minimajs/server";

export function show() {
  const id = params.get("id", Number);
  const page = searchParams.get("page", Number) ?? 1;
  const token = headers.get("authorization");
  if (!token) abort(401, "Unauthorized");
  return findItem(id, page);
}
```

| Helper                           | Description                              |
| -------------------------------- | ---------------------------------------- |
| `params.get(key, parser?)`       | Route parameters with optional type cast |
| `body<T>()`                      | Parsed request body                      |
| `headers`                        | Request headers                          |
| `searchParams.get(key, parser?)` | Query string with optional type cast     |
| `request()`                      | Native `Request` object                  |
| `response`                       | Response helpers (`status`, `headers`)   |
| `abort(status, message)`         | Throw an HTTP error response             |

---

## Scoped Plugins & Hooks

Every `meta.plugins` entry only affects the module it's declared in and its children.

```typescript
import type { Meta, Routes } from "@minimajs/server";
import { hook } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

export const meta: Meta = {
  plugins: [
    cors({ origin: "https://example.com" }),
    hook("request", ({ request }) => {
      console.log(request.method, request.url);
    }),
    hook("transform", (data) => ({
      ...data,
      _ts: Date.now(),
    })),
  ],
};

export const routes: Routes = {
  /* ... */
};
```

**Available hook types:** `request`, `transform`, `send`, `error`, `timeout`

**Lifecycle hooks:**

```typescript
import { hook } from "@minimajs/server";

app.register(
  hook.lifespan(async () => {
    await db.connect();
    return () => db.disconnect();
  })
);
```

---

## CLI

Every scaffolded project includes an `./app` script. You never need global installs.

```bash
./app dev                        # watch mode with TypeScript checking
./app build                      # production build via esbuild
./app start                      # run compiled output
./app sync                       # install from lockfile
./app i zod                      # add a package
./app un lodash                  # remove a package

./app add module orders          # scaffold a route module
./app add module orders --crud   # full CRUD (handler + repository)
./app add middleware auth
./app add plugin rate-limit
./app add openapi
./app add test                   # scaffold Jest with esbuild transform
./app add dockerfile
```

The correct Node.js version and package manager are picked up automatically.

[Full CLI reference →](https://minimajs.com/cli/)

---

## Testing

Minima.js apps are tested by sending real `Request` objects through the app with `app.handle()` — no port binding, no network, full pipeline.

Scaffold a ready-to-use Jest setup with:

```bash
./app add test
```

This generates `tests/app.ts` (shared app factory) and `tests/example.test.ts`, and adds `test`, `test:watch`, and `test:coverage` scripts to `package.json`.

---

## Related Packages

| Package                                                                    | Description                      |
| -------------------------------------------------------------------------- | -------------------------------- |
| [`@minimajs/auth`](https://www.npmjs.com/package/@minimajs/auth)           | Authentication and authorization |
| [`@minimajs/schema`](https://www.npmjs.com/package/@minimajs/schema)       | Data validation with Zod         |
| [`@minimajs/cookie`](https://www.npmjs.com/package/@minimajs/cookie)       | Cookie parsing and signing       |
| [`@minimajs/multipart`](https://www.npmjs.com/package/@minimajs/multipart) | File upload handling             |
| [`@minimajs/openapi`](https://www.npmjs.com/package/@minimajs/openapi)     | OpenAPI / Swagger docs           |
| [`@minimajs/disk`](https://www.npmjs.com/package/@minimajs/disk)           | File storage (local, S3, Azure)  |
| [`@minimajs/cli`](https://www.npmjs.com/package/@minimajs/cli)             | CLI scaffold and build tool      |

---

## Documentation

**[minimajs.com](https://minimajs.com/)**

- [Getting Started](https://minimajs.com/getting-started)
- [Core Concepts](https://minimajs.com/core-concepts/architecture)
- [CLI Reference](https://minimajs.com/cli/)
- [Routing Guide](https://minimajs.com/guides/routing)
- [Hooks Guide](https://minimajs.com/guides/hooks)
- [Error Handling](https://minimajs.com/guides/error-handling)

---

## License

MIT © [Minima.js](https://github.com/minima-js/minimajs)
