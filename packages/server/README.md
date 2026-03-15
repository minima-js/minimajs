# @minimajs/server

An HTTP framework for Node.js and Bun built entirely on Web-native APIs (`Request`, `Response`, `AbortSignal`, `ReadableStream`) — once you use it, you won't need another.

[![npm version](https://img.shields.io/npm/v/@minimajs/server.svg)](https://www.npmjs.com/package/@minimajs/server)
[![License](https://img.shields.io/npm/l/@minimajs/server.svg)](https://github.com/minima-js/minimajs/blob/main/LICENSE)

## Installation

```bash
# Bun
bun add @minimajs/server

# Node.js
npm install @minimajs/server
```

## Quick Start

```typescript
// src/index.ts
import { createApp } from "@minimajs/server/bun"; // or /node

const app = createApp();
await app.listen({ port: 3000 });
```

Drop a `module.ts` anywhere under `src/` and it's automatically loaded as a route scope:

```
src/
├── index.ts
├── users/
│   └── module.ts   → /users/*
└── posts/
    └── module.ts   → /posts/*
```

```typescript
// src/users/module.ts
import type { Routes } from "@minimajs/server";
import { params, body } from "@minimajs/server";

async function list() {
  return getUsers();
}

async function find() {
  return getUser(params.get("id"));
}

async function create() {
  return createUser(await body());
}

async function remove() {
  return deleteUser(params.get("id"));
}

export const routes: Routes = {
  "GET /": list,
  "GET /:id": find,
  "POST /": create,
  "DELETE /:id": remove,
};
```

## Runtime Support

```typescript
import { createApp } from "@minimajs/server/bun"; // Bun — uses Bun.serve()
import { createApp } from "@minimajs/server/node"; // Node.js — uses http.createServer()
```

Each runtime uses its native HTTP primitives directly — no abstraction layer in between.

## Context API

Handlers are plain functions. Access the current `Request`, route params, body, and headers from anywhere — no need to thread `req`/`res` through every call:

```typescript
// src/files/module.ts
import type { Routes } from "@minimajs/server";
import { params, request } from "@minimajs/server";
import { disk } from "../disk.js";

async function stream() {
  const name = params.get("name");
  const signal = request.signal(); // Web-native AbortSignal — aborts on client disconnect

  return disk.get(name, { signal });
}

export const routes: Routes = {
  "GET /:name": stream,
};
```

**Available context helpers:** `request()`, `params`, `body()`, `headers`, `searchParams`, `response()`

## Module Isolation

Each module has its own plugin and hook scope. Nothing leaks between modules.

```typescript
// src/admin/module.ts
import type { Routes } from "@minimajs/server";
import { hook } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

export const meta = {
  plugins: [cors({ origin: "https://admin.example.com" }), hook("request", requireAdminAuth)],
};

async function dashboard() {
  return getAdminData();
}

export const routes: Routes = {
  "GET /dashboard": dashboard,
};
```

## Hooks

```typescript
import { hook } from "@minimajs/server";

function logRequest({ request }: Context) {
  console.log(request.method, request.url);
}

function addTimestamp(data: unknown) {
  return { ...(data as object), timestamp: Date.now() };
}

export const meta = {
  plugins: [hook("request", logRequest), hook("transform", addTimestamp)],
};
```

Resource lifecycle — set up on ready, tear down on close:

```typescript
export const meta = {
  plugins: [
    hook.lifespan(async () => {
      await db.connect();
      return () => db.disconnect();
    }),
  ],
};
```

**Available hooks:** `request`, `transform`, `send`, `error`, `timeout`, `ready`, `listen`, `close`, `register`

## Custom Context

Share request-scoped values without prop drilling:

```typescript
// src/auth/context.ts
import { createContext, hook, headers } from "@minimajs/server";

export const [getUser, setUser] = createContext<User | null>(null);

async function authenticate() {
  setUser(await verifyToken(headers.get("authorization")));
}

export const authPlugin = hook("request", authenticate);
```

```typescript
// src/profile/module.ts
import type { Routes } from "@minimajs/server";
import { getUser, authPlugin } from "../auth/context.js";
import { HttpError } from "@minimajs/server";

export const meta = {
  plugins: [authPlugin],
};

function getProfile() {
  const user = getUser();
  if (!user) throw new HttpError("Unauthorized", 401);
  return user;
}

export const routes: Routes = {
  "GET /": getProfile,
};
```

## Built-in Plugins

```typescript
import { bodyParser, routeLogger, cors, shutdown } from "@minimajs/server/plugins";

export const meta = {
  plugins: [
    bodyParser({ type: ["json", "text", "form"] }), // enabled by default
    cors({ origin: "*" }),
    routeLogger(),
    shutdown(), // graceful SIGINT/SIGTERM handling
  ],
};
```

## Module Configuration

```typescript
// src/users/module.ts — override the auto-generated prefix
export const meta = {
  prefix: "/api/v1/users",
  plugins: [cors({ origin: "*" })],
};
```

```typescript
// custom discovery options
const app = createApp({
  moduleDiscovery: {
    root: new URL("./modules", import.meta.url).pathname, // must be an absolute path
    index: "route.{js,ts}", // default: module.{js,ts}
  },
});
```

## Testing

```typescript
import { createApp } from "@minimajs/server/bun";

const app = createApp({ moduleDiscovery: false, logger: false });
app.get("/", () => "Hello");

const res = await app.handle(new Request("http://localhost/"));
expect(await res.text()).toBe("Hello");
```

## Documentation

Full guides and API reference at **[minimajs.com](https://minimajs.com/)**.

- [Getting Started](https://minimajs.com/getting-started)
- [Hooks Guide](https://minimajs.com/guides/hooks)
- [Plugin Development](https://minimajs.com/guides/plugin)
- [Error Handling](https://minimajs.com/guides/error-handling)
- [API Reference](https://minimajs.com/api/@minimajs/server)

## Related Packages

- [`@minimajs/multipart`](https://www.npmjs.com/package/@minimajs/multipart) — file upload handling
- [`@minimajs/schema`](https://www.npmjs.com/package/@minimajs/schema) — request validation with Zod
- [`@minimajs/cookie`](https://www.npmjs.com/package/@minimajs/cookie) — cookie parsing and signing
- [`@minimajs/auth`](https://www.npmjs.com/package/@minimajs/auth) — authentication and authorization
- [`@minimajs/openapi`](https://www.npmjs.com/package/@minimajs/openapi) — OpenAPI/Swagger generation

## Credits

Built on [avvio](https://github.com/fastify/avvio), [find-my-way](https://github.com/delvedor/find-my-way), and [pino](https://github.com/pinojs/pino).

## License

MIT
