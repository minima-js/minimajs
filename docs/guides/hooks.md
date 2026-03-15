---
title: Hooks
sidebar_position: 5
tags:
  - hooks
  - lifecycle
---

# Hooks

Hooks in Minima.js allow you to **tap into the application and request lifecycle**, enabling custom behavior at precise points.

**In Minima.js, everything is a plugin** - even hooks are plugins. You apply hooks via:

- **`meta.plugins`** in module files (recommended)
- **`app.register(hook(...))`** for manual registration

::: code-group

```typescript [src/users/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("request", ({ request }) => {
      console.log(`${request.method} ${request.url}`);
    }),
    hook("error", (error) => {
      console.error("Error in users module:", error);
    }),
  ],
};
```

:::

> **Important:** The `meta.plugins` property **only works in module files** (files named `module.{ts,js}` by default, or whatever you configure with `moduleDiscovery.index`). It will **not** work in random files - only in files that are auto-discovered as modules. For other files or manual registration, use `app.register(hook(...))` instead.

## Quick Reference

### Request Lifecycle Hooks

- [`request`](#request) - Intercept requests before route matching (auth, rate limiting)
- [`transform`](#transform) - Modify response data before serialization
- [`send`](#send) - Post-response logging and cleanup (called just before returning)
- [`error`](/guides/error-handling#error-hook-behavior) - Handle and format errors
- [`timeout`](#timeout) - Handle request timeouts

### Application Lifecycle Hooks

- [`hook.lifespan`](#hooklifespansetupfn) - Manage resources with setup/teardown
- [`ready`](#ready) - Execute when app is ready
- [`listen`](#listen) - Execute when server starts listening
- [`close`](#close) - Execute when app shuts down
- [`register`](#register) - Execute when plugins are registered

### Request-Scoped Helpers

- [`defer`](#defercallback) - Execute after response is sent
- [`onError`](/guides/error-handling#request-scoped-error-handler-onerror) - Request-specific error handling

### Advanced

- [`hook.factory`](#hookfactory) - Direct access to the hook store for runtime add/remove
- [`hook.once`](#hookonce) - Register a hook that fires only once, then removes itself

### Other Topics

- [Hook Execution Order](#hook-execution-order) - FIFO and LIFO patterns with scope inheritance
- [Best Practices](#best-practices) - Recommendations for using hooks

---

## Application Lifecycle Hooks

Application lifecycle hooks are tied to the application's lifespan, ideal for managing resources, initializing services, or performing cleanup tasks.

### `hook.lifespan(setupFn)`

`hook.lifespan` provides a clean pattern to manage resources for the entire application. The `setupFn` runs on app startup and returns a cleanup function that executes on app shutdown.

This is perfect for managing database connections, message queues, or any resource that needs graceful setup and teardown.

**Recommended: Use in root module's `meta.plugins`**

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

const db = {
  async connect() {
    console.log("DB connected");
  },
  async disconnect() {
    console.log("DB disconnected");
  },
};

export const meta = {
  plugins: [
    hook.lifespan(async () => {
      await db.connect();

      // Return a cleanup function to run on app close
      return async () => {
        await db.disconnect();
      };
    }),
  ],
};
```

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers module with db lifecycle

await app.listen({ port: 3000 });
```

:::

### Other Application Lifecycle Hooks

#### `ready`

The `ready` hook executes when the application has completed initialization and all plugins have been registered. Use it for tasks that need to run before the server starts listening.

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("ready", async (app) => {
      console.log("Application is ready!");
      // Pre-warm caches, verify connections, etc.
    }),
  ],
};
```

:::

#### `listen`

The `listen` hook executes after the server starts listening for connections. It receives the server instance as a parameter.

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("listen", (server) => {
      console.log(`Server listening on ${server.hostname}:${server.port}`);
    }),
  ],
};
```

:::

#### `close`

The `close` hook executes when the application is shutting down. Use it for cleanup tasks like closing database connections or flushing logs.

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("close", async () => {
      console.log("Server shutting down...");
      await db.close();
      await cache.flush();
    }),
  ],
};
```

:::

> **Tip:** Use `hook.lifespan` instead of separate `ready` and `close` hooks when you need paired setup/teardown logic for a single resource.

#### `register`

The `register` hook executes whenever a plugin is registered. It receives the plugin and its options as parameters. This is primarily used for debugging or plugin inspection.

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("register", (plugin, opts) => {
      console.log(`Plugin registered: ${plugin.name || "anonymous"}`, opts);
    }),
  ],
};
```

:::

## Request Lifecycle Hooks

Request hooks execute for each incoming request, allowing you to intercept, modify, and extend the request-response cycle.

Before calling the handler → forward (Parent → Child).
After the handler → backward (Child → Parent).

### Defining Hooks

There are 4 primary ways to define request hooks:

- **`hook(name, handler)`**: Registers a single hook handler.
- **`hook.once(name, handler)`**: Registers a handler that fires **once**, then removes itself.
- **`hook.define({ ... })`**: Registers multiple hooks in a single, organized object.
- **`hook.factory(fn)`**: Direct access to the hook store — add or remove handlers at runtime.

Here’s how to define multiple hooks at once:

::: code-group

```typescript [src/api/module.ts]
import { hook, abort } from "@minimajs/server";

export const meta = {
  plugins: [
    hook.define({
      request({ request, pathname }) {
        console.log("Incoming request:", request.url());
        if (pathname === "/maintenance") {
          // need to maintain headers in responseState
          return abort("Under maintenance", 503);
        }
      },
      send(response, { request }) {
        console.log("Response sent for:", request.url());
      },
    }),
  ],
};
```

:::

### The Request Lifecycle

Minima.js provides several built-in hooks that fire at different stages of the request lifecycle. Some hooks can even return a `Response` to short-circuit the cycle.

| Hook        | When                       | Use Case                               | Can Return Response |
| ----------- | -------------------------- | -------------------------------------- | ------------------- |
| `request`   | Before route matching      | Authentication, logging, rate limiting | ✅ Yes              |
| `transform` | After handler returns data | Transform or enrich response payload   | ❌ No               |
| `send`      | After response sent        | Logging, cleanup, metrics              | ❌ No               |
| `error`     | On error                   | Format/log errors                      | ✅ Yes              |
| `timeout`   | Request timeout            | Handle slow requests                   | ✅ Yes              |

> **Error Handling:** For detailed information on `error` hook, see the [Error Handling Guide](/guides/error-handling). For global error handling behavior, use [`app.errorHandler`](/guides/error-handling#custom-error-handler-apperrorhandler).

### Lifecycle Hook Examples

#### `request`

The `request` hook intercepts a request **before it reaches the route handler**. It's ideal for authentication, logging, rate limiting, or returning an early response to short-circuit the request lifecycle.

::: code-group

```typescript [src/api/module.ts]
import { hook, abort } from "@minimajs/server";

export const meta = {
  plugins: [
    // Authentication check
    hook("request", ({ request }) => {
      if (!request.headers.get("authorization")) {
        // Early termination - bypasses route handler
        abort("Unauthorized", 401);
      }
    }),

    // Request logging
    hook("request", ({ request, pathname }) => {
      console.log(`[${request.method}] ${pathname}`, {
        userAgent: request.headers.get("user-agent"),
        timestamp: new Date().toISOString(),
      });
    }),

    // Rate limiting
    hook("request", ({ request }) => {
      const ip = request.headers.get("x-forwarded-for") || "unknown";
      if (isRateLimited(ip)) {
        abort("Too Many Requests", 429);
      }
    }),
  ],
};
```

:::

**Flow:**

<!--@include: ./diagrams/request-hook-flow.md-->

> **Important:** `request` hooks execute in **Parent → Child (FIFO) order**. Returning a `Response` terminates the chain immediately and skips the route handler.

#### `transform`

The `transform` hook modifies response data returned by a handler before it is serialized. Transform hooks execute in **Child → Parent (LIFO) order**, meaning the last registered transform runs first.

::: code-group

```typescript [src/users/module.ts]
import { hook } from "@minimajs/server";
import type { Routes } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("transform", (data) => {
      if (Array.isArray(data.users)) {
        data.users = data.users.map((u) => u.toUpperCase());
      }
      return data;
    }),
  ],
};

function listUsers() {
  return { users: ["Alice", "Bob"] };
}

export const routes: Routes = {
  "GET /list": listUsers,
  // Response: { "users": ["ALICE", "BOB"] }
};
```

:::

> `transform` hooks **cannot** return a `Response` object. They only modify data.
>
> **Important:** `transform` hooks execute in **Child → Parent (LIFO) order**. This allows child modules to transform data first, with parent transforms applying afterward.
>
> **Alternative:** For global serialization behavior (e.g., custom JSON formatting, MessagePack), use [`app.serialize`](/guides/http#custom-serializer-appserialize) instead.

#### `send`

The `send` hook executes **just before returning the final response**, after the response has been sent to the client. It receives the response object and context, making it ideal for logging, metrics, and cleanup tasks.

::: code-group

```typescript [src/api/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    // Logging response
    hook("send", (response, { request, pathname }) => {
      console.log(`[${request.method}] ${pathname}`, {
        status: response.status,
        timestamp: new Date().toISOString(),
      });
    }),

    // Metrics collection
    hook("send", (response, ctx) => {
      metrics.recordResponse({
        status: response.status,
        duration: Date.now() - ctx.startTime,
      });
    }),
  ],
};
```

:::

> **Note:** The `send` hook cannot return a `Response` object or modify the response. It's strictly for post-response tasks like logging and cleanup.

**Flow:**

<!--@include: ./diagrams/send-hook-flow.md-->

> **Important:** `send` hooks execute in **Child → Parent (LIFO) order**.

## Request-Scoped Helpers

Minima.js also offers helpers for running logic within the scope of a single request.

#### `defer(callback)`

The `defer` helper registers a callback to be executed **after the response has been sent**, ideal for non-blocking tasks like analytics or logging.

::: code-group

```typescript [src/api/module.ts]
import { defer } from "@minimajs/server";
import type { Routes } from "@minimajs/server";

function getHome() {
  defer(() => {
    console.log("Response sent, running deferred task...");
  });

  return { message: "Hello World!" };
}

export const routes: Routes = {
  "GET /": getHome,
};
```

:::

> `defer` callbacks execute after the `send` hook has completed.

> **Note:** For request-specific error handling, see [`onError`](/guides/error-handling#request-scoped-error-handler-onerror) in the Error Handling Guide.

## Hook Execution Order

Minima.js uses two execution patterns for hooks based on their purpose: **Parent → Child (FIFO)** for setup/preparation hooks and **Child → Parent (LIFO)** for cleanup/response hooks.

### Execution Patterns

#### Parent → Child (FIFO - First In, First Out)

These hooks execute in **registration order**: parent hooks run first, then child hooks. This pattern is used for:

- **Setup hooks**: `register`, `listen`, `ready`
- **Incoming request hooks**: `request`

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [hook("request", () => console.log("Parent: Auth"))],
};
```

```typescript [src/users/module.ts]
import { hook } from "@minimajs/server";
import type { Routes } from "@minimajs/server";

export const meta = {
  plugins: [hook("request", () => console.log("Child: Logging"))],
};

function listUsers() {
  return "users";
}

export const routes: Routes = {
  "GET /list": listUsers,
};
```

:::

**Execution when calling `/users/list`:**

1. "Parent: Auth" (parent runs first)
2. "Child: Logging" (child runs second)

**Why?** Parent middleware like authentication or logging should run **before** module-specific logic.

#### Child → Parent (LIFO - Last In, First Out)

These hooks execute in **reverse order**: child hooks run first, then parent hooks. This pattern is used for:

- **Response hooks**: `transform`, `send`
- **Error hooks**: `error`
- **Cleanup hooks**: `close`, `timeout`

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [hook("error", () => ({ error: "Generic error" }))],
};
```

```typescript [src/users/module.ts]
import { hook } from "@minimajs/server";
import type { Routes } from "@minimajs/server";

export const meta = {
  plugins: [hook("error", () => ({ error: "Module-specific error" }))],
};

function listUsers() {
  throw new Error("Failed");
}

export const routes: Routes = {
  "GET /list": listUsers,
};
```

:::

**Execution on error in `/users/list`:**

1. Child error handler (module-specific)
2. Parent error handler (only if child doesn't handle)

**Why?** The most specific handler (child) should try first, with parent as fallback.

### Hook Order Reference Table

| Hook        | Direction          | Order | Scope     | Use Case                               |
| ----------- | ------------------ | ----- | --------- | -------------------------------------- |
| `register`  | Parent → Child     | FIFO  | Global    | Track plugin registration              |
| `listen`    | Parent → Child     | FIFO  | Global    | Server startup notifications           |
| `ready`     | Parent → Child     | FIFO  | Global    | Initialize resources in order          |
| `close`     | **Child → Parent** | LIFO  | Global    | Cleanup in reverse order               |
| `request`   | Parent → Child     | FIFO  | Per-scope | Incoming request middleware            |
| `transform` | **Child → Parent** | LIFO  | Per-scope | Transform response data (last first)   |
| `send`      | **Child → Parent** | LIFO  | Per-scope | Post-response logging/cleanup          |
| `error`     | **Child → Parent** | LIFO  | Per-scope | Error handling (specific → general)    |
| `timeout`   | **Child → Parent** | LIFO  | Per-scope | Timeout handling (specific → fallback) |

> **Global Scope**: SERVER_HOOKS (`close`, `listen`, `ready`, `register`) are shared across all modules - there's only one server instance.
>
> **Per-scope**: LIFECYCLE_HOOKS are cloned for each child scope to maintain encapsulation.

### Practical Examples

#### Setup Flow (Parent → Child)

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

// Parent: Initialize database
export const meta = {
  plugins: [
    hook("ready", async () => {
      await db.connect();
      console.log("1. Database connected");
    }),
  ],
};
```

```typescript [src/cache/module.ts]
import { hook } from "@minimajs/server";

// Child: Initialize cache (depends on db)
export const meta = {
  plugins: [
    hook("ready", async () => {
      await cache.warmup();
      console.log("2. Cache warmed up");
    }),
  ],
};
```

:::

**Output:** 1 → 2 (dependencies initialize in order)

#### Cleanup Flow (Child → Parent)

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

// Parent: Close database
export const meta = {
  plugins: [
    hook("close", async () => {
      await db.disconnect();
      console.log("2. Database closed");
    }),
  ],
};
```

```typescript [src/cache/module.ts]
import { hook } from "@minimajs/server";

// Child: Flush cache first
export const meta = {
  plugins: [
    hook("close", async () => {
      await cache.flush();
      console.log("1. Cache flushed");
    }),
  ],
};
```

:::

**Output:** 1 → 2 (cleanup in reverse order of setup)

#### Error Handling (Child → Parent)

::: code-group

```typescript [src/module.ts]
import { hook, abort } from "@minimajs/server";

// Parent: Generic error handler
export const meta = {
  plugins: [
    hook("error", (err) => {
      if (!abort.is(err)) {
        console.log("Fallback: Generic error response", err);
        return abort({ message: "Something went wrong" }, 500);
      }
    }),
  ],
};
```

```typescript [src/users/module.ts]
import { hook } from "@minimajs/server";

// Child: Specific validation error handler
export const meta = {
  plugins: [
    hook("error", (err) => {
      if (err.name === "ValidationError") {
        console.log("Handled: Validation error");
        return { error: "Validation failed", details: err.details };
      }
      // Return undefined to let parent handle it
    }),
  ],
};

export default async function (app) {
  app.post("/create", () => {
    /* ... */
  });
}
```

:::

**Behavior:**

- ValidationError: Child handles it
- Other errors: Falls through to parent

### Scope Inheritance

Child modules inherit hooks from their parents, but sibling modules remain isolated.

::: code-group

```typescript [src/module.ts]
import { hook } from "@minimajs/server";

// Parent hook - inherited by all children
export const meta = {
  plugins: [hook("request", () => console.log("Parent"))],
};

export default async function (app) {
  app.get("/health", () => "ok");
}
```

```typescript [src/users/module.ts]
import { hook } from "@minimajs/server";

// Child scope 1
export const meta = {
  plugins: [hook("request", () => console.log("Child 1"))],
};

export default async function (app) {
  app.get("/list", () => "users");
}
```

```typescript [src/admin/module.ts]
import { hook } from "@minimajs/server";

// Child scope 2
export const meta = {
  plugins: [hook("request", () => console.log("Child 2"))],
};

export default async function (app) {
  app.get("/dashboard", () => "admin");
}
```

:::

**Execution when calling `/users/list`:**

```
Child 1  (child hook - runs first)
Parent   (inherited from parent - runs second)
```

**Execution when calling `/admin/dashboard`:**

```
Child 2  (child hook - runs first)
Parent   (inherited from parent - runs second)
```

<!--@include: ./diagrams/hook-scope-inheritance.md-->

> A request to `/users/list` will only trigger hooks from **users module**, not from its sibling admin module.

---

## Manual Registration (Alternative)

If you're not using module discovery (`moduleDiscovery: false`) or need to register hooks manually in your entry file, you can use `app.register(hook(...))`:

```typescript
import { createApp, hook } from "@minimajs/server/bun";

const app = createApp({ moduleDiscovery: false });

// Register hooks manually
app.register(
  hook("request", ({ request }) => {
    console.log(`${request.method} ${request.url}`);
  })
);

app.register(
  hook.lifespan(async () => {
    await db.connect();
    return async () => await db.disconnect();
  })
);

// Register a module manually
app.register(
  async (app) => {
    app.register(hook("error", () => ({ error: "Module error" })));
    app.get("/users", () => "users");
  },
  { prefix: "/api" }
);

await app.listen({ port: 3000 });
```

**When to use manual registration:**

- Apps without module discovery
- Registering global plugins in entry files
- Building reusable plugin libraries
- Quick prototypes or single-file apps

**Recommended:** Use `meta.plugins` in module files for better organization and automatic discovery.

---

## `hook.factory`

`hook.factory` gives you direct access to the raw hook store, letting you **add or remove handlers at runtime** without going through the standard `hook()` wrapper.

```typescript
import { hook } from "@minimajs/server";

hook.factory((hookStore, app) => {
  hookStore.ready.add(onReady);
  hookStore.close.add(onClose);
});
```

### Removing hooks at runtime

Because `hookStore[name]` is a plain `Set`, you can call `.delete(fn)` at any point to unregister a handler:

```typescript
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook.factory((hookStore) => {
      function onRequest(ctx) {
        console.log("request:", ctx.request.url);
      }

      hookStore.request.add(onRequest);

      // Remove after 60 seconds
      setTimeout(() => {
        hookStore.request.delete(onRequest);
      }, 60_000);
    }),
  ],
};
```

### Conditional registration

```typescript
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook.factory((hookStore, app) => {
      if (process.env.NODE_ENV === "development") {
        hookStore.request.add(function devLogger(ctx) {
          console.log(`[dev] ${ctx.request.method} ${ctx.request.url}`);
        });
      }
    }),
  ],
};
```

> `hook.factory` is the escape hatch — use it when `hook()`, `hook.once()`, or `hook.define()` don't provide enough control. The callback receives the same `HookStore` object that all other hook APIs write to.

---

## `hook.once`

`hook.once` registers a hook that fires exactly once. After the first invocation the handler automatically removes itself from the hook store, so it never runs again.

Accepts the same hook names as `hook()` and returns a plugin — use it anywhere you'd use a regular hook.

```typescript
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    // Log only the very first request that hits this module
    hook.once("request", ({ request }) => {
      console.log("First request received:", request.url);
    }),
  ],
};
```

**Common use cases:**

- One-time initialization triggered by the first request
- Record-once metrics or flags
- Emit a single event after the first occurrence of a lifecycle event

```typescript
import { hook } from "@minimajs/server";

// Notify monitoring on the first error, then stop
export const meta = {
  plugins: [
    hook.once("error", (err) => {
      alerting.notify("First error after deploy", { error: err });
      // Does not affect error propagation - other error hooks still run
    }),
  ],
};
```

> `hook.once` supports all hook names: `request`, `transform`, `send`, `error`, `timeout`, `close`, `listen`, `ready`, `register`.

---

## Best Practices

- **Use `meta.plugins`** in module files instead of `app.register()` for better organization
- **Use `hook.lifespan`** for managing resources with paired setup and teardown logic (databases, connections, etc.)
- **Use `defer`** for non-blocking, post-response tasks like logging or analytics
- **Use `onError`** for request-specific error handling that shouldn't be global
- **Avoid returning `Response` objects** from hooks unless necessary for short-circuiting (authentication, rate-limiting)
- **Use `response()` helper** to create responses that preserve context headers set by plugins
- **Register hooks in the appropriate scope** to ensure proper FIFO/LIFO ordering based on hook type
- **Use `hook.define`** to organize multiple related hooks together
- **Use `hook.once`** when a hook should only fire one time (first request, first error, etc.)
- **Use `hook.factory`** only when you need to remove hooks at runtime or conditionally register based on app state

---

## Related Guides

- [Error Handling](/guides/error-handling) - Detailed `error` hook behavior and patterns
- [HTTP Helpers](/guides/http) - Response shaping and request helper APIs
- [Middleware](/guides/middleware) - When full request wrapping is required
- [Route Descriptors](/guides/route-descriptors) - Read route metadata inside hooks
