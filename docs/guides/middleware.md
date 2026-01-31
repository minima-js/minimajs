---
title: Middleware
sidebar_position: 5
tags:
  - middleware
  - request
  - async-context
---

# Middleware

Middleware in Minima.js provides a way to **wrap the entire request-response cycle** using an onion-like execution pattern. Unlike hooks which react to specific lifecycle events, middleware gives you full control over the request flow with `next()` semantics.

::: warning Prefer Hooks Over Middleware
Minima.js is optimized for a single middleware (the internal `contextProvider`). Adding additional middlewares introduces overhead in the request chain. For most use cases, **use hooks instead**:

- **Error handling** → `hook("error", ...)`
- **Authentication** → `hook("request", ...)`
- **Logging** → `hook("request", ...)` or `hook("send", ...)`
- **Validation** → `hook("request", ...)`

Only use middleware when you **must wrap the request** with before/after logic that requires async context preservation (e.g., APM transactions, OpenTelemetry spans).
:::

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
| **Scope**              | ⚠️ Always global                   | ✅ Module-scoped                       |
| **Performance**        | ⚠️ Adds overhead per middleware    | ✅ Optimized                           |
| **Async Context**      | ✅ Preserved through chain         | ⚠️ May break in loop iterations       |
| **Use Case**           | APM, tracing                       | Logging, error handling, validation    |

> **Important:** Middleware is **always registered globally**, regardless of where you define it. Even if you register middleware inside a module, it will apply to all requests across the entire application. Use hooks for module-scoped behavior.

::: tip Register Middleware on Root App Only
To keep your code future-proof, always register middleware on the root app explicitly. If you need to register middleware from within a module, use `app.$root`:

```typescript
import { middleware, plugin } from "@minimajs/server";

export const meta = {
  plugins: [
    plugin.sync((app) => {
      app.$root.register(
        middleware(async (ctx, next) => {
          // Your middleware logic
          return next();
        })
      );
    }),
  ],
};
```

This ensures your middleware is explicitly global and won't break if module-scoped middleware is added in the future.
:::

### When to Use Middleware

Only use middleware when you need to **wrap** the request with before/after logic:

- **APM/Tracing** - Elastic APM, OpenTelemetry spans that must wrap the entire request
- **Timing with async context** - When you need timing data to propagate through async operations

### When to Use Hooks

- **Error Handling** - Use `error` hook for scoped error handling
- **Authentication** - Use `request` hook to validate and reject requests
- **Logging** - Log requests/responses as side effects
- **Validation** - Quick request validation
- **Cleanup** - Post-response cleanup tasks via `send` hook

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

### Request Timing with APM

```typescript
import { middleware } from "@minimajs/server";
import apm from "elastic-apm-node";

app.register(
  middleware(async (ctx, next) => {
    const transaction = apm.startTransaction(ctx.pathname, "request");
    const start = Date.now();

    try {
      const response = await next();
      transaction?.setOutcome("success");
      console.log(`${ctx.pathname} took ${Date.now() - start}ms`);
      return response;
    } catch (error) {
      transaction?.setOutcome("failure");
      apm.captureError(error);
      throw error; // Re-throw to let error hooks handle it
    } finally {
      transaction?.end();
    }
  })
);
```

> **Note:** For error handling, authentication, rate limiting, and other request validation, use hooks instead. Hooks provide module-scoped behavior and integrate with the error handling system.

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

- **Use middleware for APM/tracing** - Async context is preserved through the chain
- **Always return `next()`** - Don't skip calling next unless intentional
- **Don't call `next()` multiple times** - This will throw an error
- **Keep middleware focused** - Each middleware should do one thing well
- **Order matters** - Register middleware in the order you want them to execute
- **Prefer hooks** - Use hooks for error handling, authentication, validation, and side effects

> **Advanced:** To customize `AsyncLocalStorage` behavior, see [Context Provider](../advanced/context-provider.md).
