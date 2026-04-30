---
name: minimajs
description: >
  Comprehensive guide for building backends with minimajs — a TypeScript-first HTTP framework for Node.js and Bun.
  Use this skill whenever the user is working with minimajs, imports from @minimajs/*, asks about routing, validation,
  auth, file uploads, OpenAPI docs, storage, cookies, hooks, plugins, or testing in a minimajs project. Also trigger
  when the user wants to create a new minimajs app from scratch or extend an existing one.
---

# minimajs

minimajs is a TypeScript-first, ESM-only HTTP framework for Node.js and Bun. Its central idea: **request context lives in `AsyncLocalStorage`**, so you never thread `req`/`res` through function calls — just import and call context helpers from anywhere in the request scope.

## Scaffolding a new project

```sh
# Node.js (default)
npx @minimajs/cli new hello-world

# Bun
bunx @minimajs/cli new hello-world --bun

# With options
npx @minimajs/cli new hello-world --pm pnpm      # package manager: bun | pnpm | yarn | npm
npx @minimajs/cli new hello-world --no-install   # skip dependency installation
npx @minimajs/cli new hello-world --no-git       # skip git init
```

The scaffolded project includes `./app` — a shell script entry point for all CLI commands.

---

## CLI

minimajs ships a CLI accessed via the `./app` shell script scaffolded into every project.

### Dev workflow

```sh
./app dev          # watch + rebuild + auto-restart
./app dev --no-run # watch/rebuild only, don't run
./app build        # one-shot production build
./app start        # run the compiled output
```

### Configuration — `minimajs.config.ts`

```typescript
import { defineConfig } from "@minimajs/cli";

export default defineConfig(({ dev, mode }) => ({
  envFile: ".env",
  sourcemap: dev, // sourcemaps in dev only
  // import: ["./src/instrument.ts"], // pre-load before entry (instrumentation, APM)
}));
```

`defineConfig` accepts a plain config object or a factory receiving `{ mode, dev }` — where `mode` is `"dev" | "build" | "start"` and `dev` is shorthand for `mode === "dev"`.

### Generators — `./app add <type> <name>`

All generators create a file and auto-patch the nearest `module.ts` to register it.

#### Module

```sh
./app add module orders           # src/orders/module.ts
./app add module api/orders       # src/api/orders/module.ts
```

#### Hook

```sh
./app add hook request                  # src/hooks/request.hook.ts → src/module.ts
./app add hook orders/request           # src/orders/request.hook.ts → src/orders/module.ts
./app add hook request --type send      # hook type: request | send | transform | ...
./app add hook request --global         # registers via app.register() in src/index.ts
```

#### Plugin

```sh
./app add plugin hello                  # src/plugins/hello.plugin.ts → src/module.ts
./app add plugin orders/hello           # src/orders/hello.plugin.ts → src/orders/module.ts
```

Plugin export name is `toCamelCase(name)` — e.g. `hello` → `export const hello: Plugin`.

#### Middleware

Middleware is always global — always registered in root `src/module.ts`.

```sh
./app add middleware request            # src/middlewares/request.middleware.ts
./app add middleware auth/jwt           # src/auth/jwt.middleware.ts
```

Export name is `toCamelCase(name)` — e.g. `request` → `export const request = middleware(...)`.

#### Service

```sh
./app add service users                 # src/users/service.ts
```

#### Disk

```sh
./app add disk                          # src/disks/index.ts  →  export const disk = createDisk()
./app add disk uploads                  # src/disks/uploads.ts →  export const uploads = createDisk()
./app add disk primary --driver aws-s3  # S3 driver
./app add disk cdn --driver azure-blob  # Azure Blob driver
./app add disk router --proto           # createProtoDisk() for multi-provider routing
```

---

## App creation

```typescript
import { logger } from "@minimajs/server";
// Bun
import { createApp } from "@minimajs/server/bun";
// Node.js
import { createApp } from "@minimajs/server/node";

const app = createApp();
app.get("/", () => ({ message: "Hello" }));
const addr = await app.listen({ port: 3000 });
logger.info("App started %s", addr);
```

`createApp(options?)` options:

- `prefix` — URL prefix for all routes
- `logger` — Pino logger instance, or `false` to disable
- `moduleDiscovery` — disable file-based module discovery (useful in tests)

---

## Two routing styles

### 1. File-based modules (preferred)

Directory structure maps to URL prefixes. Each `module.ts` registers routes for its subtree.

```
src/
├── index.ts           ← createApp() + listen
├── module.ts          ← root: global plugins, /api prefix
├── users/
│   └── module.ts      ← /api/users/*
└── posts/
    └── module.ts      ← /api/posts/*
```

A module file can export:

- `routes` — declarative route map
- `meta` — prefix + plugins scoped to this module
- `default function(app)` — programmatic registration

```typescript
// src/users/module.ts
import type { Meta, Routes } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    /* scoped plugins */
  ],
};

export const routes: Routes = {
  "GET /": listUsers,
  "POST /": createUser,
  "GET /:id": getUser,
  "DELETE /:id": deleteUser,
};
```

Route params: `:id`, `:id?` (optional), `*` (wildcard), `:id(\\d+)` (regex).

---

## Context API — core helpers

All imported from `@minimajs/server`. Call from any function within a request.

```typescript
import {
  body,
  params,
  headers,
  searchParams,
  request,
  response,
  abort,
  redirect,
  defer,
  onError,
  context,
  createContext,
} from "@minimajs/server";

// Request body (parsed JSON by default)
const data = body<{ name: string }>();

// Route params
const id = params.get("id"); // throws 404 if missing
const maybeId = params.optional("id"); // undefined if missing
const all = params<{ id: string }>();

// Query string
const page = searchParams.get("page");
const all = searchParams<{ page: string; limit: string }>();

// Request headers
const token = headers.get("authorization");
const all = headers<{ authorization: string }>();

// Set response headers
headers.set("x-request-id", "abc123");
headers.set({ "x-foo": "bar", "x-baz": "qux" });

// Response
response({ id: 1 }); // set body
response.status(201); // set status code
// Returning from handler also sets body:
function getUser() {
  return { id: 1, name: "Alice" };
}

// Request object (Web API Request)
const req = request();
const url = request.url(); // URL object
const signal = request.signal(); // AbortSignal (client disconnect)
const ip = request.ip(); // client IP (needs proxy plugin)

// Run after response is sent
defer(() => analytics.track("request"));

// Per-request error handler
onError((err) => logger.error(err));
```

---

## Error handling

```typescript
import { abort, redirect } from "@minimajs/server";

abort("Not found", 404); // throw HttpError
abort.notFound("User not found"); // 404 shorthand
abort.is(err); // type guard
abort.rethrow(err); // re-throw if HttpError
redirect("/login"); // 302
redirect("/new-path", true); // 301
```

**Override error response shape globally** (do this at app startup):

```typescript
import { HttpError } from "@minimajs/server/error";
import { ValidationError } from "@minimajs/schema";

HttpError.toJSON = (err) => ({
  success: false,
  message: err.response,
  statusCode: err.status,
});

ValidationError.toJSON = (err) => ({
  success: false,
  error: "Validation failed",
  issues: err.issues?.map((i) => ({ field: i.path.join("."), message: i.message })),
});
```

---

## Package selection guide

| Need                               | Package               | Key import                                         |
| ---------------------------------- | --------------------- | -------------------------------------------------- |
| Validate request body/params/query | `@minimajs/schema`    | `createBody`, `createParams`, `createSearchParams` |
| Authenticate users                 | `@minimajs/auth`      | `createAuth`                                       |
| File uploads                       | `@minimajs/multipart` | `multipart`, `createMultipart`                     |
| File storage (FS/S3/Azure)         | `@minimajs/disk`      | `createDisk`, `createProtoDisk`                    |
| OpenAPI docs                       | `@minimajs/openapi`   | `openapi`, `describe`, `schema`                    |
| Cookies                            | `@minimajs/cookie`    | `cookies`                                          |
| CORS                               | `@minimajs/server`    | `cors` (built-in plugin)                           |
| Graceful shutdown                  | `@minimajs/server`    | `shutdown` (built-in plugin)                       |
| Proxy/IP extraction                | `@minimajs/server`    | `proxy` (built-in plugin)                          |

---

## Common patterns

### Validation + OpenAPI

```typescript
import { createBody, createParams, createResponse, schema } from "@minimajs/schema";
import { describe } from "@minimajs/openapi";
import { handler } from "@minimajs/server";
import { z } from "zod";

const getBody = createBody(z.object({ name: z.string(), email: z.string().email() }));
const userResponse = createResponse(z.object({ id: z.string(), name: z.string() }));

export const routes: Routes = {
  "POST /": handler(describe({ summary: "Create user", tags: ["Users"] }), schema(getBody, userResponse), async () => {
    const { name, email } = getBody();
    return { id: crypto.randomUUID(), name };
  }),
};
```

### Authentication

```typescript
// auth/context.ts
import { createAuth } from "@minimajs/auth";
import { UnauthorizedError } from "@minimajs/auth";
import { headers } from "@minimajs/server";

export const [authPlugin, getUser] = createAuth(async () => {
  const token = headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new UnauthorizedError();
  return await verifyToken(token); // return user object
});

// root module.ts — register globally
export const meta: Meta = { plugins: [authPlugin] };

// protected route
export const routes: Routes = {
  "GET /profile": () => {
    const user = getUser.required(); // throws 401 if not authenticated
    return { name: user.name };
  },
};
```

### File upload

```typescript
import { createMultipart } from "@minimajs/multipart/schema";
import { helpers } from "@minimajs/multipart";
import { z } from "zod";

const upload = createMultipart({
  name: z.string().min(1),
  avatar: z
    .file()
    .max(5 * 1024 * 1024)
    .mime(["image/jpeg", "image/png"]),
});

export const routes: Routes = {
  "POST /upload": async () => {
    const { name, avatar } = await upload(); // validates + throws 422 on failure
    const filename = await helpers.save(avatar, "./public/avatars");
    return { name, avatar: `/avatars/${filename}` };
  },
};
```

### Global plugins (CORS, OpenAPI, shutdown)

```typescript
// src/module.ts (root)
import { cors, shutdown } from "@minimajs/server/plugins";
import { openapi } from "@minimajs/openapi";

export const meta: Meta = {
  prefix: "/api",
  plugins: [cors({ origin: "*" }), shutdown(), openapi({ info: { title: "My API", version: "1.0.0" } })],
};
```

### Custom request-scoped context

```typescript
import { createContext, plugin, hook } from "@minimajs/server";

const [getRequestId, setRequestId] = createContext<string>();

export const requestIdPlugin = plugin.sync((app) => {
  app.register(hook("request", () => setRequestId(crypto.randomUUID())));
  app.register(
    hook("send", (res, ctx) => {
      ctx.responseState.headers.set("x-request-id", getRequestId() ?? "");
    })
  );
});

export { getRequestId }; // callable from anywhere in request scope
```

### Database lifecycle

```typescript
import { hook } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    hook.lifespan(async () => {
      await db.connect();
      return async () => db.disconnect(); // runs on close
    }),
  ],
};
```

---

## Reference files

For deeper API details, read the relevant reference file:

- [references/server.md](references/server.md) — full hook lifecycle, plugin system, built-in plugins, module discovery config
- [references/schema.md](references/schema.md) — all `createBody`/`createParams`/`createSearchParams`/`createHeaders` options, async variants, response schemas
- [references/auth.md](references/auth.md) — `createAuth` options, `required` mode, `UnauthorizedError`/`ForbiddenError`
- [references/multipart.md](references/multipart.md) — `raw`/`streaming` namespaces, `helpers` API, limits config
- [references/disk.md](references/disk.md) — full Disk API, ProtoDisk multi-provider routing, S3/Azure drivers, disk hooks
- [references/openapi.md](references/openapi.md) — `describe()`, `internal()`, `generateOpenAPIDocument()`, security schemes
- [references/testing.md](references/testing.md) — `app.handle()`, `createRequest()`, mocking context
- [references/cookie.md](references/cookie.md) — `cookies()`, `cookies.get/set/remove()`, set options, type-safe cookies
