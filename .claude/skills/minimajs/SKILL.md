---
name: minimajs
description: Write and review code for the Minima.js web framework (@minimajs/server). Use when building HTTP servers, defining routes, creating plugins, or working with any @minimajs/* package.
argument-hint: [task or question]
---

# Minima.js Coding Assistant

You are an expert in Minima.js (`@minimajs/server`), a TypeScript-first HTTP framework for Node.js and Bun. Help the developer write idiomatic, correct Minima.js code.

## Core Philosophy

- **Everything is a plugin** — hooks, middleware, and features are all plugins
- **Context-aware** — use `AsyncLocalStorage`-based helpers (`params`, `body`, `headers`) instead of passing req/res
- **File-based modules** — files named `module.ts` are auto-discovered and scoped
- **Functional & composable** — composition over inheritance
- **Web Standards** — uses native `Request`/`Response`, not Node.js abstractions

---

## Installation & Setup

```bash
# Bun
bun add @minimajs/server

# Node.js
npm install @minimajs/server
```

**package.json** must have `"type": "module"` (ESM only).

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["bun-types"]
  }
}
```

---

## Entry Point

```typescript
// src/index.ts
import { createApp } from "@minimajs/server/bun"; // or /node

const app = createApp(); // auto-discovers module.ts files from src/

await app.listen({ port: 3000 });
```

**Runtime-specific imports:**
- `@minimajs/server/bun` — uses `Bun.serve()`
- `@minimajs/server/node` — uses `http.createServer()`
- `@minimajs/server` — defaults to node

---

## Project Structure

```
src/
├── index.ts              # Entry point
├── module.ts             # Root module (optional prefix for all routes)
├── users/
│   ├── module.ts         # Auto-discovered → /users/*
│   └── service.ts
├── posts/
│   └── module.ts         # Auto-discovered → /posts/*
└── auth/
    ├── module.ts
    └── context.ts
```

---

## Modules

A module is an async function exported as `default`. Files named `module.ts` are auto-discovered.

```typescript
// src/users/module.ts
import type { App } from "@minimajs/server";
import { params, body } from "@minimajs/server";

export default async function (app: App) {
  app.get("/list", () => getUsers());
  app.get("/:id", () => getUser(params.get("id")));
  app.post("/create", () => createUser(body()));
}
```

**Module-scoped plugins** via `meta` export (only works in module files):

```typescript
// src/users/module.ts
import { hook } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

export const meta = {
  plugins: [
    cors({ origin: "https://example.com" }),
    hook("request", ({ request }) => console.log(request.method)),
  ],
};

export default async function (app) {
  app.get("/list", () => getUsers());
}
```

Each module scope is **fully isolated** — plugins in `users` don't affect `posts`.

**Custom discovery config:**
```typescript
const app = createApp({
  moduleDiscovery: {
    root: "./modules",  // default: entry file's dir
    index: "route",     // default: "module"
  },
});

// Disable auto-discovery
const app = createApp({ moduleDiscovery: false });
```

---

## Routing

```typescript
app.get("/path", handler)
app.post("/path", handler)
app.put("/path", handler)
app.patch("/path", handler)
app.delete("/path", handler)
app.head("/path", handler)
app.options("/path", handler)
app.all("/path", handler)   // all methods

// Advanced
app.route({ method: "GET", url: "/path", handler });
```

**Route handlers** can return any serializable value — it becomes the JSON response:

```typescript
app.get("/users", () => [{ id: 1, name: "Alice" }]);
app.get("/hello", () => "Hello World");          // text
app.get("/nothing", () => {});                   // empty
```

---

## Context API (no prop drilling)

Import helpers from `@minimajs/server` and call them anywhere inside a request lifecycle:

```typescript
import { params, body, headers, searchParams, request, response, context } from "@minimajs/server";

app.get("/users/:id", () => {
  const { id } = params<{ id: string }>();         // route params
  const q = searchParams().get("q");               // query string
  const auth = headers.get("authorization");       // request headers
  const req = request();                           // native Web API Request
  return { id, q };
});

app.post("/users", () => {
  const data = body<{ name: string }>();           // parsed body (typed)
  return createUser(data);
});
```

**`params` usage:**
```typescript
params<{ id: string }>()         // returns full params object
params.get("id")                 // get single param (string)
params.get("id", Number)         // with type converter
```

**Optional params:** `/:id?`
**Wildcards:** `/*` → `params.get("*")`
**Regex:** `/files/:file(^\\d+).png`

---

## Route Metadata

Attach metadata as `[Symbol, value]` tuples before the handler:

```typescript
const kAuth = Symbol("auth");

app.get("/admin", [kAuth, true], () => ({ secret: "data" }));

// Access in hook
hook("request", () => {
  const meta = context().route.metadata;
  if (meta.get(kAuth)) { /* check auth */ }
})
```

---

## Hooks

Hooks tap into request/application lifecycle. Registered via `meta.plugins` (preferred) or `app.register()`.

### Request Lifecycle Hooks

| Hook | Direction | Can Return Response | Use Case |
|------|-----------|-------------------|----------|
| `request` | Parent→Child (FIFO) | ✅ Yes | Auth, rate limiting, logging |
| `transform` | Child→Parent (LIFO) | ❌ No | Modify response data |
| `send` | Child→Parent (LIFO) | ❌ No | Post-response logging, cleanup |
| `error` | Child→Parent (LIFO) | ✅ Yes | Error handling |
| `timeout` | Child→Parent (LIFO) | ✅ Yes | Timeout handling |

### Application Lifecycle Hooks

| Hook | Direction | Use Case |
|------|-----------|----------|
| `hook.lifespan` | — | Paired setup/teardown (databases, connections) |
| `ready` | FIFO | After all plugins registered |
| `listen` | FIFO | After server starts listening |
| `close` | LIFO | Server shutdown cleanup |
| `register` | FIFO | Plugin registration events |

### Hook Examples

```typescript
import { hook, abort, defer } from "@minimajs/server";

// Auth gate on request
hook("request", ({ request }) => {
  if (!request.headers.get("authorization")) {
    abort("Unauthorized", 401);
  }
})

// Transform response data
hook("transform", (data) => {
  return { ...data, timestamp: Date.now() };
})

// Post-response logging
hook("send", (response, { request }) => {
  console.log(`${request.method} → ${response.status}`);
})

// Error handler
hook("error", (err) => {
  if (abort.is(err)) {
    abort({ error: err.message }, err.statusCode);
  }
  throw err; // re-throw for parent to handle
})

// Database lifecycle (preferred pattern)
hook.lifespan(async () => {
  await db.connect();
  return async () => { await db.disconnect(); };
})

// Multiple hooks at once
hook.define({
  request({ request }) { console.log(request.url); },
  send(response) { console.log(response.status); },
})
```

**`defer`** — run after response is sent:
```typescript
app.get("/", () => {
  defer(() => analytics.track("page_view"));
  return { ok: true };
});
```

---

## Plugins

Plugins are reusable, encapsulated units of functionality.

```typescript
import { plugin, hook } from "@minimajs/server";

// Async plugin factory
export const authPlugin = (options: { secretKey: string }) =>
  plugin(async function auth(app) {
    app.register(
      hook("request", async ({ request }) => {
        const token = request.headers.get("authorization")?.split(" ")[1];
        if (!token) abort({ error: "Unauthorized" }, 401);
        // verify token...
      })
    );
  });

// Sync plugin
export const corsPlugin = plugin.sync(function cors(app) {
  app.register(
    hook("request", (ctx) => {
      ctx.responseState.headers.set("Access-Control-Allow-Origin", "*");
    })
  );
});
```

**Compose multiple plugins:**
```typescript
import { compose } from "@minimajs/server";

const securityStack = compose(
  cors({ origin: "https://example.com" }),
  authPlugin({ secretKey: process.env.JWT_SECRET! }),
  rateLimitPlugin({ max: 100 })
);

export const meta = { plugins: [securityStack] };
```

**`compose.create()`** — wrap modules with plugins (manual registration only):
```typescript
const withAuth = compose.create(authPlugin({ secretKey: "..." }));

app.register(
  withAuth(async (app) => {
    app.get("/protected", () => "secret");
  }),
  { prefix: "/api" }
);
```

---

## Built-in Plugins

```typescript
import { bodyParser, cors, routerLogger, shutdown } from "@minimajs/server/plugins";

// Body parser (enabled by default, parses JSON)
app.register(bodyParser({ type: ["json", "text", "form"], clone: false }));
app.register(bodyParser({ enabled: false })); // disable

// CORS
app.register(cors({ origin: "*", methods: ["GET", "POST"] }));

// Route logger
app.register(routerLogger());

// Graceful shutdown
app.register(shutdown());
```

---

## Error Handling

```typescript
import { abort, redirect } from "@minimajs/server";
import { HttpError } from "@minimajs/server/error";

// Throw HTTP errors
abort({ error: "Not found" }, 404);
abort.notFound("User not found");        // 404
abort.badRequest("Invalid input");       // 400
abort.unauthorized("Login required");    // 401
abort.forbidden("Access denied");        // 403

// Check if error is from abort
if (abort.is(error)) {
  console.log(error.statusCode);
}

// Redirects
redirect("/new-path");        // 302
redirect("/permanent", true); // 301
```

**Customize error response format:**
```typescript
HttpError.toJSON = (err) => ({
  success: false,
  message: err.response,
  statusCode: err.status,
  timestamp: new Date().toISOString(),
});
```

**Request-scoped error handler:**
```typescript
import { onError } from "@minimajs/server";

app.get("/risky", () => {
  onError((err) => console.error("Request failed:", err));
  return riskyOperation();
});
```

---

## Custom Context (`createContext`)

Share request-scoped data without prop drilling:

```typescript
import { createContext, hook } from "@minimajs/server";

// Define context
const [getUser, setUser] = createContext<User | null>(null);

// Set in middleware
const authMiddleware = hook("request", async ({ request }) => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  const user = await verifyToken(token);
  setUser(user);
});

// Access anywhere in request lifecycle
app.get("/profile", () => {
  const user = getUser(); // no prop drilling!
  if (!user) abort.unauthorized();
  return user;
});
```

---

## Testing

```typescript
import { createApp } from "@minimajs/server/node";
import { createRequest } from "@minimajs/server/mock";

const app = createApp({ moduleDiscovery: false });
app.get("/", () => "Hello World");

const response = await app.handle(new Request("http://localhost/"));
// or
const response = await app.handle(createRequest("/", { method: "GET" }));

expect(await response.text()).toBe("Hello World");
expect(response.status).toBe(200);
```

---

## Related Packages

| Package | Purpose |
|---------|---------|
| `@minimajs/auth` | Authentication & authorization |
| `@minimajs/schema` | Request validation with Zod |
| `@minimajs/cookie` | Cookie parsing & signing |
| `@minimajs/multipart` | File upload handling |

---

## Common Patterns

### Auth middleware with custom context

```typescript
// src/auth/context.ts
import { createContext } from "@minimajs/server";
export interface User { id: string; role: string; }
export const [getUser, setUser] = createContext<User | null>(null);

// src/auth/plugin.ts
import { plugin, hook, abort } from "@minimajs/server";
import { setUser } from "./context.js";

export const requireAuth = plugin(async function auth(app) {
  app.register(hook("request", async ({ request }) => {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) abort.unauthorized();
    const user = await verifyToken(token);
    setUser(user);
  }));
});

// src/users/module.ts
import { requireAuth } from "../auth/plugin.js";
import { getUser } from "../auth/context.js";

export const meta = { plugins: [requireAuth] };

export default async function (app) {
  app.get("/me", () => getUser());
}
```

### Database connection lifecycle

```typescript
// src/module.ts (root module)
import { hook } from "@minimajs/server";
import { db } from "../db/client.js";

export const meta = {
  plugins: [
    hook.lifespan(async () => {
      await db.connect(process.env.DATABASE_URL!);
      return () => db.disconnect();
    }),
  ],
};

export default async function (app) {
  app.get("/health", async () => ({ db: await db.ping() }));
}
```

### Scoped error handling

```typescript
// src/api/module.ts
import { hook, abort } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("error", (err) => {
      if (err.name === "ValidationError") {
        abort({ error: "Validation failed", details: err.issues }, 422);
      }
      // undefined → propagates to parent error handler
    }),
  ],
};
```

---

## Anti-patterns to Avoid

- ❌ Don't pass `req`/`res` manually — use context helpers (`params`, `body`, etc.)
- ❌ Don't use the deprecated `interceptor` API — use `plugin()` + `hook()` instead
- ❌ Don't return `new Response()` from error hooks — it bypasses transform hooks; use `abort()` instead
- ❌ Don't put `meta.plugins` in non-module files — it only works in auto-discovered module files
- ❌ Don't use `compose.create()` with `meta.plugins` — it's only for `app.register()` manual registration
