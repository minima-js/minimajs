---
title: Middleware
sidebar_position: 5
tags:
  - middleware
  - request
  - async-context
---

# Middleware

Middleware in Minima.js provides a powerful way to **wrap the entire request-response cycle** using an onion-like execution pattern. Unlike hooks which react to specific lifecycle events, middleware gives you full control over the request flow with `next()` semantics.

**In Minima.js, everything is a plugin** - middleware is registered as a plugin via:

- **`meta.plugins`** in module files (recommended)
- **`app.register(middleware(...))`** for manual registration

::: code-group

```typescript [src/module.ts]
import { middleware } from "@minimajs/server";

export const meta = {
  plugins: [
    middleware(async (ctx, next) => {
      const start = Date.now();
      const response = await next();
      console.log(`Request took ${Date.now() - start}ms`);
      return response;
    }),
  ],
};

export default async function (app) {
  // Your routes here
}
```

:::

> **Important:** The `meta.plugins` property **only works in module files** (files named `module.ts` by default). For other files or manual registration, use `app.register(middleware(...))` instead.

## Quick Reference

- [`middleware()`](#basic-usage) - Register middleware that wraps the request/response cycle
- [Execution Order](#execution-order) - Understand the onion model (FIFO in, LIFO out)
- [Middleware vs Hooks](#middleware-vs-hooks) - When to use each
- [Async Context](#async-context-and-apm) - APM, tracing, and AsyncLocalStorage compatibility

---

## Basic Usage

Middleware functions receive the request context and a `next` function. Call `next()` to continue to the next middleware or route handler:

```typescript
import { middleware } from "@minimajs/server";

// Simple logging middleware
app.register(
  middleware(async (ctx, next) => {
    console.log(`${ctx.request.method} ${ctx.pathname}`);
    return next();
  })
);
```

### Wrapping the Response (Onion Model)

Middleware can execute code **before** and **after** the handler:

```typescript
app.register(
  middleware(async (ctx, next) => {
    // BEFORE: runs before handler
    console.log("Request started");

    const response = await next(); // Call handler

    // AFTER: runs after handler returns
    console.log("Request completed");
    return response;
  })
);
```

### Modifying the Response

Middleware can intercept and modify the response:

```typescript
app.register(
  middleware(async (ctx, next) => {
    const response = await next();

    // Add custom headers
    const headers = new Headers(response.headers);
    headers.set("x-response-time", `${Date.now() - start}ms`);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  })
);
```

### Short-Circuiting

Return a `Response` without calling `next()` to short-circuit the chain:

```typescript
app.register(
  middleware(async (ctx, next) => {
    const token = ctx.request.headers.get("authorization");

    if (!token) {
      // Short-circuit - handler never runs
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    return next();
  })
);
```

---

## Execution Order

Middleware follows the **onion model**: execution flows inward through `next()` calls, then unwinds outward as each middleware returns.

### Multiple Middlewares

```typescript
app.register(
  middleware(
    async (ctx, next) => {
      console.log("1. First middleware - before");
      const response = await next();
      console.log("6. First middleware - after");
      return response;
    },
    async (ctx, next) => {
      console.log("2. Second middleware - before");
      const response = await next();
      console.log("5. Second middleware - after");
      return response;
    },
    async (ctx, next) => {
      console.log("3. Third middleware - before");
      const response = await next();
      console.log("4. Third middleware - after");
      return response;
    }
  )
);

app.get("/test", () => {
  console.log("Handler executed");
  return { success: true };
});
```

**Output:**

```
1. First middleware - before
2. Second middleware - before
3. Third middleware - before
Handler executed
4. Third middleware - after
5. Second middleware - after
6. First middleware - after
```

### Visual Representation

```
Request ──►┌─────────────────────────────────────────────┐
           │ Middleware 1 (before)                       │
           │  ┌─────────────────────────────────────────┐│
           │  │ Middleware 2 (before)                   ││
           │  │  ┌─────────────────────────────────────┐││
           │  │  │ Middleware 3 (before)               │││
           │  │  │  ┌─────────────────────────────────┐│││
           │  │  │  │         Handler                 ││││
           │  │  │  └─────────────────────────────────┘│││
           │  │  │ Middleware 3 (after)                │││
           │  │  └─────────────────────────────────────┘││
           │  │ Middleware 2 (after)                    ││
           │  └─────────────────────────────────────────┘│
           │ Middleware 1 (after)                        │
           └─────────────────────────────────────────────┘◄── Response
```

---

## Middleware vs Hooks

Both middleware and hooks allow you to intercept requests, but they serve different purposes:

| Feature                | Middleware                         | Hooks                                  |
| ---------------------- | ---------------------------------- | -------------------------------------- |
| **Execution Model**    | Onion (wrap with `next()`)         | Sequential (FIFO/LIFO)                 |
| **Response Wrapping**  | ✅ Full control before/after       | ❌ Limited (separate hooks)            |
| **Async Context**      | ✅ Preserved through chain         | ⚠️ May break in loop iterations       |
| **Short-circuit**      | ✅ Return Response                 | ✅ Return Response (request hook)      |
| **Modify Response**    | ✅ Intercept and transform         | ⚠️ Only via transform hook            |
| **Use Case**           | APM, auth, compression, timing     | Logging, metrics, side effects         |

### When to Use Middleware

- **APM/Tracing** - Elastic APM, OpenTelemetry, custom tracing
- **Authentication** - Wrap requests with auth context
- **Compression** - Modify response body
- **Timing/Metrics** - Measure request duration
- **Error Boundaries** - Catch and handle errors

### When to Use Hooks

- **Logging** - Log requests/responses as side effects
- **Metrics** - Record metrics without modifying flow
- **Validation** - Quick request validation
- **Cleanup** - Post-response cleanup tasks

---

## Async Context and APM

Middleware is the recommended way to integrate APM tools (Elastic APM, OpenTelemetry, etc.) because it **preserves async context** through the entire request chain.

### Why Middleware for APM?

Minima.js uses `AsyncLocalStorage` internally via `executionContext`. Middleware runs as a **direct call chain** within this context, ensuring APM transactions are properly tracked:

```typescript
import { middleware } from "@minimajs/server";
import apm from "elastic-apm-node";

app.register(
  middleware(async (ctx, next) => {
    const transaction = apm.startTransaction(ctx.pathname, "request");

    try {
      const response = await next();
      transaction?.setOutcome("success");
      return response;
    } catch (error) {
      transaction?.setOutcome("failure");
      throw error;
    } finally {
      transaction?.end();
    }
  })
);
```

### Why Not Hooks for APM?

Hooks use a `for...await` loop internally, which can break async context propagation:

```typescript
// ⚠️ This may lose APM context
app.register(
  hook("request", async (ctx) => {
    const transaction = apm.startTransaction(); // May be lost
  })
);
```

The middleware approach keeps everything in a single promise chain, preserving the async context.

---

## Common Patterns

### Authentication Middleware

```typescript
app.register(
  middleware(async (ctx, next) => {
    const token = ctx.request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Validate token and add user to context
    const user = await validateToken(token);
    (ctx as any).user = user;

    return next();
  })
);

// Access user in handlers
app.get("/profile", (ctx) => {
  return { user: (ctx as any).user };
});
```

### CORS Middleware

```typescript
app.register(
  middleware(async (ctx, next) => {
    const response = await next();

    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", "*");
    headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE");
    headers.set("access-control-allow-headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  })
);
```

### Request Timing

```typescript
app.register(
  middleware(async (ctx, next) => {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;

    const headers = new Headers(response.headers);
    headers.set("x-response-time", `${duration}ms`);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  })
);
```

### Rate Limiting

```typescript
const requestCounts = new Map<string, { count: number; resetAt: number }>();

app.register(
  middleware(async (ctx, next) => {
    const ip = ctx.request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    let record = requestCounts.get(ip);

    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs };
    }

    record.count++;
    requestCounts.set(ip, record);

    if (record.count > maxRequests) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }

    return next();
  })
);
```

### Error Boundary

```typescript
app.register(
  middleware(async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      console.error("Unhandled error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: process.env.NODE_ENV === "development" ? error.message : undefined,
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }
  })
);
```

---

## Error Propagation

Errors thrown by handlers or inner middlewares propagate through the middleware chain, allowing any middleware to catch and handle them:

```typescript
app.register(
  middleware(async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      // Catch errors from handlers or inner middlewares
      console.error("Caught:", error.message);

      // Transform the error into a response
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  })
);
```

### How It Works

1. Errors propagate up through the middleware chain in reverse order (innermost to outermost)
2. Any middleware can catch errors with `try/catch` around `next()`
3. If no middleware catches the error, the default `contextProvider` catches it and uses `app.errorHandler`
4. The `send` hook always runs, whether the response comes from success or error handling

```
Request ──► Middleware 1 ──► Middleware 2 ──► Handler (throws)
                                                   │
                  ◄── error propagates ◄───────────┘
                  │
            Middleware 1 catches
                  │
                  ▼
           Returns Response ──► send hook ──► Client
```

### APM Integration

This error propagation model is perfect for APM (Application Performance Monitoring) tools:

```typescript
app.register(
  middleware(async (ctx, next) => {
    const transaction = apm.startTransaction(ctx.pathname, "request");

    try {
      const response = await next();
      transaction?.setOutcome("success");
      return response;
    } catch (error) {
      transaction?.setOutcome("failure");
      apm.captureError(error);
      throw error; // Re-throw to let default error handler process it
    } finally {
      transaction?.end();
    }
  })
);
```

---

## Context Provider

The `contextProvider` is a special middleware that wraps the entire request in an execution context. It also serves as the final error handler - any uncaught errors are caught here and processed by `app.errorHandler`.

By default, Minima.js registers one that uses `AsyncLocalStorage`:

```typescript
// Default context provider (registered automatically)
srv.register(contextProvider((ctx, next) => executionContext.run(ctx, next)));
```

### Custom Context Provider

You can override the default context provider to add custom async context:

```typescript
import { contextProvider, executionContext } from "@minimajs/server";

app.register(
  contextProvider(async (ctx, next) => {
    // Custom setup before executionContext
    const requestId = crypto.randomUUID();
    (ctx as any).requestId = requestId;

    // IMPORTANT: Always call executionContext.run to preserve async context
    return executionContext.run(ctx, async () => {
      const response = await next();

      // Custom cleanup after response
      return response;
    });
  })
);
```

> **Important:** When overriding `contextProvider`, always wrap `next()` with `executionContext.run(ctx, ...)` to preserve the async context that other parts of Minima.js depend on.

---

## Registration Patterns

### Single Middleware

```typescript
app.register(
  middleware(async (ctx, next) => {
    console.log("Single middleware");
    return next();
  })
);
```

### Multiple Middlewares (Same Registration)

```typescript
app.register(
  middleware(
    async (ctx, next) => {
      console.log("First");
      return next();
    },
    async (ctx, next) => {
      console.log("Second");
      return next();
    }
  )
);
```

### Multiple Registrations

```typescript
app.register(
  middleware(async (ctx, next) => {
    console.log("First");
    return next();
  })
);

app.register(
  middleware(async (ctx, next) => {
    console.log("Second");
    return next();
  })
);
```

All patterns maintain FIFO order for the "before" phase and LIFO for the "after" phase.

---

## Best Practices

- **Use middleware for wrapping** - When you need to execute code both before and after the handler
- **Use middleware for APM/tracing** - Async context is preserved through the chain
- **Always return `next()`** - Unless you're intentionally short-circuiting
- **Don't call `next()` multiple times** - This will throw an error
- **Keep middleware focused** - Each middleware should do one thing well
- **Order matters** - Register middleware in the order you want them to execute
- **Use `contextProvider`** - For custom async context that needs to wrap everything
- **Prefer hooks for side effects** - Use hooks for logging/metrics that don't need to wrap the response
