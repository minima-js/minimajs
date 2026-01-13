---
title: Hooks
sidebar_position: 5
tags:
  - hooks
  - lifecycle
---

# Hooks

Hooks in Minima.js allow you to **tap into the application and request lifecycle**, enabling custom behavior at precise points. They are central to extending and customizing your application's behavior.

## Quick Reference

### Request Lifecycle Hooks

- [`request`](#request) - Intercept requests before route matching (auth, rate limiting)
- [`transform`](#transform) - Modify response data before serialization
- [`send`](#send) - Modify headers or override response before sending
- [`sent`](#sent) - Post-response cleanup and logging
- [`error`](/guides/error-handling#error-hook-behavior) - Handle and format errors
- [`errorSent`](/guides/error-handling#errorsent-hook) - Post-error cleanup and monitoring
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

### Other Topics

- [Hook Execution Order](#hook-execution-order) - FIFO and LIFO patterns with scope inheritance
- [Best Practices](#best-practices) - Recommendations for using hooks

---

## Application Lifecycle Hooks

Application lifecycle hooks are tied to the application's lifespan, ideal for managing resources, initializing services, or performing cleanup tasks.

### `hook.lifespan(setupFn)`

`hook.lifespan` provides a clean pattern to manage resources for the entire application. The `setupFn` runs on app startup and returns a cleanup function that executes on app shutdown.

This is perfect for managing database connections, message queues, or any resource that needs graceful setup and teardown.

```ts
import { createApp, hook } from "@minimajs/server";

const db = {
  async connect() {
    console.log("DB connected");
  },
  async disconnect() {
    console.log("DB disconnected");
  },
};

const app = createApp();

const dbLifecycle = hook.lifespan(async () => {
  await db.connect();

  // Return a cleanup function to run on app close
  return async () => {
    await db.disconnect();
  };
});

app.register(dbLifecycle);
```

### Other Application Lifecycle Hooks

#### `ready`

The `ready` hook executes when the application has completed initialization and all plugins have been registered. Use it for tasks that need to run before the server starts listening.

```ts
app.register(
  hook("ready", async (app) => {
    console.log("Application is ready!");
    // Pre-warm caches, verify connections, etc.
  })
);
```

#### `listen`

The `listen` hook executes after the server starts listening for connections. It receives the server instance as a parameter.

```ts
app.register(
  hook("listen", (server) => {
    console.log(`Server listening on ${server.hostname}:${server.port}`);
  })
);
```

#### `close`

The `close` hook executes when the application is shutting down. Use it for cleanup tasks like closing database connections or flushing logs.

```ts
app.register(
  hook("close", async () => {
    console.log("Server shutting down...");
    await db.close();
    await cache.flush();
  })
);
```

> **Tip:** Use `hook.lifespan` instead of separate `ready` and `close` hooks when you need paired setup/teardown logic for a single resource.

#### `register`

The `register` hook executes whenever a plugin is registered. It receives the plugin and its options as parameters. This is primarily used for debugging or plugin inspection.

```ts
app.register(
  hook("register", (plugin, opts) => {
    console.log(`Plugin registered: ${plugin.name || "anonymous"}`, opts);
  })
);
```

## Request Lifecycle Hooks

Request hooks execute for each incoming request, allowing you to intercept, modify, and extend the request-response cycle.

### Defining Hooks

There are two primary ways to define request hooks:

- **`hook(name, handler)`**: Registers a single hook handler.
- **`hook.define({ ... })`**: Registers multiple hooks in a single, organized object.

Here’s how to define multiple hooks at once:

```ts
import { createApp, hook } from "@minimajs/server";

const app = createApp();

app.register(
  hook.define({
    request({ request, pathname }) {
      console.log("Incoming request:", request.url);
      if (pathname === "/maintenance") {
        // need to maintain headers in responseState
        return abort("Under maintenance", 503);
      }
    },
    sent({ request }) {
      console.log("Sent response for:", request.url);
    },
  })
);
```

### The Request Lifecycle

Minima.js provides several built-in hooks that fire at different stages of the request lifecycle. Some hooks can even return a `Response` to short-circuit the cycle.

| Hook        | When                       | Use Case                               | Can Return Response |
| ----------- | -------------------------- | -------------------------------------- | ------------------- |
| `request`   | Before route matching      | Authentication, logging, rate limiting | ✅ Yes              |
| `transform` | After handler returns data | Transform or enrich response payload   | ❌ No               |
| `send`      | Before sending             | Modify headers, log response           | ✅ Yes              |
| `sent`      | After response sent        | Cleanup, metrics                       | ❌ No               |
| `error`     | On error                   | Format/log errors                      | ✅ Yes              |
| `errorSent` | After error sent           | Reporting or monitoring                | ❌ No               |
| `timeout`   | Request timeout            | Handle slow requests                   | ✅ Yes              |

> **Error Handling:** For detailed information on `error` and `errorSent` hooks, see the [Error Handling Guide](/guides/error-handling). For global error handling behavior, use [`app.errorHandler`](/guides/error-handling#custom-error-handler-apperrorhandler).

### Lifecycle Hook Examples

#### `request`

The `request` hook intercepts a request **before it reaches the route handler**. It's ideal for authentication, logging, rate limiting, or returning an early response to short-circuit the request lifecycle.

```typescript
// Authentication check
app.register(
  hook("request", ({ request }) => {
    if (!request.headers.get("authorization")) {
      // Early termination - bypasses route handler
      abort("Unauthorized", 401);
    }
  })
);

// Request logging
app.register(
  hook("request", ({ request, pathname }) => {
    console.log(`[${request.method}] ${pathname}`, {
      userAgent: request.headers.get("user-agent"),
      timestamp: new Date().toISOString(),
    });
  })
);

// Rate limiting
app.register(
  hook("request", ({ request }) => {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
      abort("Too Many Requests", 429);
    }
  })
);
```

**Flow:**

<!--@include: ./diagrams/request-hook-flow.md-->

> **Important:** `request` hooks execute in **Parent → Child (FIFO) order**. Returning a `Response` terminates the chain immediately and skips the route handler.

#### `transform`

The `transform` hook modifies response data returned by a handler before it is serialized.

```typescript
app.register(
  hook("transform", (data) => {
    if (Array.isArray(data.users)) {
      data.users = data.users.map((u) => u.toUpperCase());
    }
    return data;
  })
);

app.get("/users", () => {
  return { users: ["Alice", "Bob"] };
});
// Response: { "users": ["ALICE", "BOB"] }
```

> `transform` hooks **cannot** return a `Response` object. They only modify data.
>
> **Alternative:** For global serialization behavior (e.g., custom JSON formatting, MessagePack), use [`app.serialize`](/guides/http#custom-serializer-appserialize) instead.

#### `send`

The `send` hook executes **just before creating the final `Response` object**, after data has been transformed and serialized. It receives the serialized response body and can modify headers via context.

```typescript
// Adding headers (recommended - preserves context state)
app.register(
  hook("send", ({ response }) => {
    response.headers.set("X-Custom-Header", "Minima.js");
    response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
  })
);

// Logging serialized output
app.register(
  hook("send", (serialized, { request, pathname }) => {
    console.log(`[${request.method}] ${pathname}`, {
      bodySize: typeof serialized === "string" ? serialized.length : "stream",
      timestamp: new Date().toISOString(),
    });
  })
);
```

> **⚠️ Warning:** Returning a `Response` object bypasses the context's response state (headers, status). Only use for complete response overrides when absolutely necessary.

**Flow:**

<!--@include: ./diagrams/send-hook-flow.md-->

> **Important:** `send` hooks execute in **Child → Parent (LIFO) order**. Returning a `Response` terminates the chain immediately.

#### `sent`

The `sent` hook runs after the response is dispatched. Use it for cleanup or post-processing tasks that don't need to block the response.

```typescript
app.register(
  hook("sent", ({ request }) => {
    console.log(`Response sent for: ${request.url}`);
  })
);
```

## Request-Scoped Helpers

Minima.js also offers helpers for running logic within the scope of a single request.

#### `defer(callback)`

The `defer` helper registers a callback to be executed **after the response has been sent**, ideal for non-blocking tasks like analytics or logging.

```ts
import { createApp, defer } from "@minimajs/server";

const app = createApp();

app.get("/", () => {
  defer(() => {
    console.log("Response sent, running deferred task...");
  });

  return { message: "Hello World!" };
});
```

> `defer` is a request-scoped run after `sent` or `errorSent` hook.

> **Note:** For request-specific error handling, see [`onError`](/guides/error-handling#request-scoped-error-handler-onerror) in the Error Handling Guide.

## Hook Execution Order

Minima.js uses two execution patterns for hooks based on their purpose: **Parent → Child (FIFO)** for setup/preparation hooks and **Child → Parent (LIFO)** for cleanup/response hooks.

### Execution Patterns

#### Parent → Child (FIFO - First In, First Out)

These hooks execute in **registration order**: parent hooks run first, then child hooks. This pattern is used for:

- **Setup hooks**: `register`, `listen`, `ready`
- **Incoming request hooks**: `request`, `transform`

```typescript
app.register(hook("request", () => console.log("Parent: Auth")));

app.register(async (app) => {
  app.register(hook("request", () => console.log("Child: Logging")));
  app.get("/users", () => "users");
});

// Request to /users executes:
// 1. "Parent: Auth"     (parent runs first)
// 2. "Child: Logging"   (child runs second)
```

**Why?** Parent middleware like authentication or logging should run **before** module-specific logic.

#### Child → Parent (LIFO - Last In, First Out)

These hooks execute in **reverse order**: child hooks run first, then parent hooks. This pattern is used for:

- **Response hooks**: `send`, `sent`
- **Error hooks**: `error`, `errorSent`
- **Cleanup hooks**: `close`, `timeout`

```typescript
app.register(hook("error", () => ({ error: "Generic error" })));

app.register(async (app) => {
  app.register(hook("error", () => ({ error: "Module-specific error" })));
  app.get("/users", () => {
    throw new Error("Failed");
  });
});

// Error in /users executes:
// 1. Child error handler (module-specific)
// 2. Parent error handler (only if child doesn't handle)
```

**Why?** The most specific handler (child) should try first, with parent as fallback.

### Hook Order Reference Table

| Hook        | Direction          | Order | Scope     | Use Case                               |
| ----------- | ------------------ | ----- | --------- | -------------------------------------- |
| `register`  | Parent → Child     | FIFO  | Global    | Track plugin registration              |
| `listen`    | Parent → Child     | FIFO  | Global    | Server startup notifications           |
| `ready`     | Parent → Child     | FIFO  | Global    | Initialize resources in order          |
| `close`     | **Child → Parent** | LIFO  | Global    | Cleanup in reverse order               |
| `request`   | Parent → Child     | FIFO  | Per-scope | Incoming request middleware            |
| `transform` | Parent → Child     | FIFO  | Per-scope | Transform response data in order       |
| `send`      | **Child → Parent** | LIFO  | Per-scope | Modify response before sending         |
| `sent`      | **Child → Parent** | LIFO  | Per-scope | Post-response logging/cleanup          |
| `error`     | **Child → Parent** | LIFO  | Per-scope | Error handling (specific → general)    |
| `errorSent` | **Child → Parent** | LIFO  | Per-scope | Post-error logging/cleanup             |
| `timeout`   | **Child → Parent** | LIFO  | Per-scope | Timeout handling (specific → fallback) |

> **Global Scope**: SERVER_HOOKS (`close`, `listen`, `ready`, `register`) are shared across all modules - there's only one server instance.
>
> **Per-scope**: LIFECYCLE_HOOKS are cloned for each child scope to maintain encapsulation.

### Practical Examples

#### Setup Flow (Parent → Child)

```typescript
// Parent: Initialize database
app.register(
  hook("ready", async () => {
    await db.connect();
    console.log("1. Database connected");
  })
);

// Child: Initialize cache (depends on db)
app.register(async (app) => {
  app.register(
    hook("ready", async () => {
      await cache.warmup();
      console.log("2. Cache warmed up");
    })
  );
});

// Output: 1 → 2 (dependencies initialize in order)
```

#### Cleanup Flow (Child → Parent)

```typescript
// Parent: Close database
app.register(
  hook("close", async () => {
    await db.disconnect();
    console.log("2. Database closed");
  })
);

// Child: Flush cache first
app.register(async (app) => {
  app.register(
    hook("close", async () => {
      await cache.flush();
      console.log("1. Cache flushed");
    })
  );
});

// Output: 1 → 2 (cleanup in reverse order of setup)
```

#### Error Handling (Child → Parent)

```typescript
// Parent: Generic error handler
app.register(
  hook("error", (err) => {
    console.log("Fallback: Generic error response");
    return { error: "Something went wrong" };
  })
);

// Child: Specific validation error handler
app.register(async (app) => {
  app.register(
    hook("error", (err) => {
      if (err.name === "ValidationError") {
        console.log("Handled: Validation error");
        return { error: "Validation failed", details: err.details };
      }
      // Return undefined to let parent handle it
    })
  );

  app.post("/users", () => {
    /* ... */
  });
});

// ValidationError: Child handles it
// Other errors: Falls through to parent
```

### Scope Inheritance

Child scopes inherit hooks from their parents, but sibling scopes remain isolated.

```typescript
const app = createApp();

// Parent hook - inherited by all children
app.register(hook("request", () => console.log("Parent")));

// Child scope 1
app.register(async (app) => {
  app.register(hook("request", () => console.log("Child 1")));
  app.get("/users", () => "users");
});

// Child scope 2
app.register(async (app) => {
  app.register(hook("request", () => console.log("Child 2")));
  app.get("/admin", () => "admin");
});
```

**Execution when calling `/users`:**

```
Child 1  (child hook - runs first)
Parent   (inherited from parent - runs second)
```

**Execution when calling `/admin`:**

```
Child 2  (child hook - runs first)
Parent   (inherited from parent - runs second)
```

<!--@include: ./diagrams/hook-scope-inheritance.md-->

> A request to `/users` will only trigger hooks from **Child 1**, not from its sibling.

## Best Practices

- **Use `hook.lifespan`** for managing resources with paired setup and teardown logic (databases, connections, etc.)
- **Use `defer`** for non-blocking, post-response tasks like logging or analytics
- **Use `onError`** for request-specific error handling that shouldn't be global
- **Avoid returning `Response` objects** from hooks unless necessary for short-circuiting (authentication, rate-limiting)
- **Prefer `createResponseFromState`** over `new Response()` to preserve context headers set by plugins
- **Register hooks in the appropriate scope** to ensure proper FIFO/LIFO ordering based on hook type
- **Use `hook.define`** to organize multiple related hooks together
