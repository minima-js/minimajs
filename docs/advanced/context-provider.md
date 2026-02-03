# Context Provider

The `contextProvider` plugin controls how Minima.js manages async context using Node.js `AsyncLocalStorage`. Use this to change the default async context behavior.

## How It Works

Minima.js uses `AsyncLocalStorage` to maintain request context across async operations. The `contextProvider` plugin lets you configure how this context is established.

```typescript
import { contextProvider } from "@minimajs/server/plugins";
import { executionContext } from "@minimajs/server";

app.register(contextProvider((ctx, next) => executionContext.run(ctx, next)));
```

The `contextProvider` callback receives:

- `ctx` - The request context
- `next` - Function to continue the middleware chain

## Default: `executionContext.run`

By default, Minima.js uses `executionContext.run()` which creates an isolated async context for each request:

```typescript
import { contextProvider } from "@minimajs/server/plugins";
import { executionContext } from "@minimajs/server";

// This is the default - no need to register manually
app.register(
  contextProvider((ctx, next) => {
    return executionContext.run(ctx, next);
  })
);
```

**Characteristics:**

- Each request gets its own isolated context
- Context is automatically cleaned up when the request completes
- Safe for concurrent requests
- Recommended for most use cases

## Alternative: `executionContext.enterWith`

For scenarios where you need the context to persist beyond the callback scope, use `enterWith`:

```typescript
import { contextProvider } from "@minimajs/server/plugins";
import { executionContext } from "@minimajs/server";

app.register(
  contextProvider((ctx, next) => {
    executionContext.enterWith(ctx);
    return next();
  })
);
```

**Characteristics:**

- Sets the context for all subsequent async operations in the current execution
- Does not automatically clean up - context persists until overwritten
- Useful when integrating with libraries that manage their own async context
- Use with caution in concurrent environments

## Important Notes

1. **Only one `contextProvider` is active** - Registering a new one replaces the previous
2. **Always call `next()`** - Failing to call `next()` will hang the request
3. **Preserve async context** - Always use `executionContext.run()` or `enterWith()` to ensure context helpers like `context()`, `params()`, and `body()` work correctly

## When to Use

Use `contextProvider` only when you need to change the AsyncLocalStorage behavior. For request wrapping, timing, or tracing, use [middleware](../guides/middleware.md) instead.
