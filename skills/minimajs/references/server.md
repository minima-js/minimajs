# @minimajs/server — Deep Reference

## Hooks

Hooks are the primary extension point. All hooks are plugins registered via `app.register(hook(...))` or in `meta.plugins`.

### Hook execution order

- **Parent→Child (FIFO):** `request`, `ready`, `listen`, `register`
- **Child→Parent (LIFO):** `transform`, `send`, `error`, `timeout`, `close`

### All hook signatures

```typescript
import { hook } from "@minimajs/server";

// Before route handler — can short-circuit by returning a Response
hook("request", (ctx: Context) => void | Response | Promise<void | Response>)

// Transform handler return value — runs LIFO, result passed up the chain
hook("transform", (data: unknown, ctx: Context) => unknown)

// After response is built — runs LIFO, cannot modify response
hook("send", (response: Response, ctx: Context) => void)

// On unhandled error — can return a Response to override default error response
hook("error", (error: unknown, ctx: Context) => void | unknown | Response)

// On request timeout — can return a Response
hook("timeout", (ctx: Context) => void | Response)

// After app is fully booted
hook("ready", (app: App) => void | Promise<void>)

// After server starts listening
hook("listen", (address: AddressInfo, app: App) => void)

// On app close/shutdown
hook("close", () => void | Promise<void>)

// On every plugin registration
hook("register", (plugin, opts) => void)
```

### Hook variants

```typescript
// Fire once, then auto-remove
hook.once("request", handler);

// Register multiple hooks at once
hook.define({
  request: (ctx) => {
    /* ... */
  },
  send: (res, ctx) => {
    /* ... */
  },
  close: () => {
    /* ... */
  },
});

// Lifecycle: setup runs on ready, returned fn runs on close
hook.lifespan(async () => {
  const conn = await db.connect();
  return async () => conn.close();
});

// Direct access to HookStore (a Set) — add/remove at runtime
hook.factory((store) => {
  const fn = (ctx) => {
    /* ... */
  };
  store.request.add(fn);
  // later: store.request.delete(fn)
});
```

---

## Plugin system

Three plugin types:

```typescript
import { plugin } from "@minimajs/server";

// Async plugin — encapsulated scope (avvio-wrapped), receives (app, opts)
const myPlugin = plugin(async (app, opts: { apiKey: string }) => {
  app.get("/path", handler);
}, "myPlugin"); // optional name

// Sync plugin — runs immediately, receives (app)
const mySync = plugin.sync((app) => {
  app.register(hook("request", authenticate));
});

// Module — async, prefix-aware via opts.prefix
const myModule = async (app, opts: { prefix: string }) => {
  app.get("/path", handler); // mounted at opts.prefix + /path
};
```

### compose

```typescript
import { compose } from "@minimajs/server";

// Merge multiple plugins into one
const combined = compose(corsPlugin, authPlugin, rateLimitPlugin);

// Higher-order: apply plugins to every module
const withDefaults = compose.create(corsPlugin, authPlugin);
export default withDefaults(async (app) => {
  app.get("/", handler);
});
```

### descriptor (module-level)

Apply route metadata descriptors to all routes in a module:

```typescript
import { descriptor } from "@minimajs/server";
import { schema } from "@minimajs/schema";

export const meta: Meta = {
  plugins: [
    descriptor(schema(getBody)), // applies schema to every route in this module
  ],
};
```

### middleware (onion model)

Use sparingly — always global, best for APM/tracing:

```typescript
import { middleware } from "@minimajs/server";

app.register(
  middleware(async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${Date.now() - start}ms`);
  })
);
```

---

## Built-in plugins

All from `@minimajs/server/plugins` (or `@minimajs/server` for some):

### bodyParser

Auto-registered (JSON). Customize or disable:

```typescript
import { bodyParser } from "@minimajs/server/plugins";

// Change default type
app.register(bodyParser({ type: "form" }));

// Multiple types
app.register(bodyParser({ type: ["json", "text"] }));

// Skip parsing for a specific route (descriptor)
app.post("/raw", bodyParser.skip(), handler);

// Supported types: "json" | "text" | "form" | "arrayBuffer" | "blob"
```

### cors

```typescript
import { cors } from "@minimajs/server/plugins";

app.register(
  cors({
    origin: "*", // or string[] or (origin) => boolean
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"],
    exposedHeaders: ["x-request-id"],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
    preflightContinue: false,
  })
);
```

### proxy

```typescript
import { proxy } from "@minimajs/server/plugins";

// Extract IP, host, proto from proxy headers (X-Forwarded-*)
app.register(proxy({ trustProxies: true }));

// Trust specific IPs or subnets
app.register(proxy({ trustProxies: ["127.0.0.1", "10.0.0.0/8"] }));

// Trust loopback
app.register(proxy({ trustProxies: "loopback" }));

// Custom trust validator
app.register(
  proxy({
    trustProxies: (ctx) => {
      const ip = ctx.incomingMessage?.socket?.remoteAddress;
      return ip?.startsWith("10.") ?? false;
    },
  })
);

// Fine-grained control over ip/host/proto extraction
app.register(
  proxy({
    trustProxies: true,
    ip: { proxyDepth: 2 }, // how many proxies deep
    host: { header: ["x-forwarded-host"], stripPort: true },
    proto: { header: ["x-forwarded-proto", "cloudfront-forwarded-proto"] },
  })
);

// Disable specific extractions
app.register(proxy({ trustProxies: true, host: false, proto: false }));

// Custom callbacks for complex scenarios
app.register(
  proxy({
    trustProxies: true,
    ip: (ctx) => ctx.request.headers.get("x-real-ip"),
    proto: (ctx) => ctx.request.headers.get("x-forwarded-proto") ?? "https",
    host: (ctx) => ctx.request.headers.get("host") ?? "example.com",
  })
);

// IP-only shorthand
app.register(proxy.ip());
app.register(proxy.ip({ trustProxies: "loopback", ip: { proxyDepth: 1 } }));

// After registering, use in handlers:
const ip = request.ip();
```

### shutdown

```typescript
import { shutdown } from "@minimajs/server/plugins";

app.register(
  shutdown({
    signals: ["SIGINT", "SIGTERM"], // default
    timeout: 5000, // ms to wait for graceful close
  })
);
```

### express (Node.js only)

Wrap Express-style `(req, res, next)` middleware for use in minimajs:

```typescript
import { express } from "@minimajs/server/plugins";

app.register(
  express((req, res, next) => {
    console.log("Request URL:", req.url);
    next();
  })
);
```

---

## Module discovery configuration

```typescript
createApp({
  moduleDiscovery: {
    root: "./modules", // default: cwd
    index: "route.ts", // default: "module.ts"
  },
  // Disable entirely (useful for tests or fully programmatic setup)
  // moduleDiscovery: false,
});
```

Custom module file naming: set `index` to whatever filename you prefer (`"routes.ts"`, `"index.ts"`, etc.).

---

## Route descriptors

A descriptor is either a `[symbol, value]` tuple or a `(routeConfig) => void` function. Attach to routes to carry metadata (for OpenAPI, auth guards, rate limiting, etc.).

```typescript
import { createContext } from "@minimajs/server";

// Define a custom descriptor
const kRateLimit = Symbol("rateLimit");
export const rateLimit = (rpm: number): RouteMetaDescriptor => [kRateLimit, rpm];

// Read in a hook
hook("request", (ctx) => {
  const rpm = ctx.route.metadata[kRateLimit];
  if (rpm) enforceRateLimit(rpm);
});

// Attach to route
app.get("/expensive", rateLimit(10), handler);
// or in routes map:
"GET /expensive": handler(rateLimit(10), myHandler)
```

---

## handler() wrapper

`handler(...descriptors, fn)` — attach descriptors to a function without inline spreading:

```typescript
import { handler } from "@minimajs/server";
import { schema } from "@minimajs/schema";
import { describe } from "@minimajs/openapi";

export const routes: Routes = {
  "POST /users": handler(describe({ summary: "Create user" }), schema(getBody, UserResponse), createUser),
};
```

---

## Context object

`context()` returns the full `Context`:

```typescript
interface Context {
  request: Request;
  responseState: { status: number; headers: Headers; body: unknown };
  route: { path: string; method: string; metadata: Record<symbol, unknown> };
  locals: Record<string, unknown>; // arbitrary per-request storage
  app: App;
  serverAdapter: unknown; // runtime-specific (Bun/Node internals)
}
```

`context().locals` is a plain object — useful for passing data between hooks and handlers without `createContext`.

### maybeContext / safe

```typescript
import { maybeContext, safe } from "@minimajs/server";

// Returns null if called outside a request scope (no throw)
const ctx = maybeContext();

// Escape request scope — runs callback without inheriting AsyncLocalStorage context
const detached = safe(() => {
  // context() would throw here — useful for background work
  doBackgroundTask();
});
```

---

## App lifecycle

```typescript
const app = createApp();

// Register routes + plugins...
app.get("/", handler);
app.register(myPlugin);

// Boot the app (runs ready hooks, starts module discovery)
await app.ready();

// Start listening
const addr = await app.listen({ port: 3000 });

// Test a route without starting a server
const response = await app.handle(new Request("http://localhost/"));

// Graceful shutdown (runs close hooks)
await app.close();
```

---

## contextProvider (advanced)

Wrap the entire request lifecycle in custom middleware (e.g., APM, tracing):

```typescript
import { contextProvider } from "@minimajs/server/plugins";

app.register(
  contextProvider(async (ctx, next) => {
    const span = tracer.startSpan("http.request");
    try {
      return await next();
    } finally {
      span.end();
    }
  })
);
```
