---
title: Interceptors
sidebar_position: 4
tags:
  - middleware
  - interceptor
  - hooks
---

# Interceptors

Interceptors are Minima.js's powerful middleware system that allows you to intercept and modify requests, responses, and errors. Unlike traditional middleware, interceptors are **module-scoped**, giving you fine-grained control over where they apply.

## Why Interceptors?

Common use cases include:

- Authentication and authorization
- Request/response transformation
- Logging and metrics
- Error handling and formatting
- Adding data to the context

## Types of Interceptors

Minima.js provides several interceptor types:

### 1. Module-Scoped Interceptor

Wrap a module with middleware that only applies to routes within that module.

```typescript
import { interceptor } from "@minimajs/server";

async function authMiddleware() {
  const token = headers.get("authorization");
  if (!token) abort("Unauthorized", 401);
}

// Wraps the module - middleware only runs for routes in this module
const protectedModule = interceptor([authMiddleware], async (app) => {
  app.get("/profile", () => ({ user: "data" }));
  app.get("/settings", () => ({ settings: "data" }));
});

app.register(protectedModule);
app.get("/public", () => "No auth required!"); // authMiddleware NOT called
```

**Key Point**: The middleware is **isolated** to the wrapped module. Other modules are unaffected.

### 2. Injected Interceptor (`interceptor.use`)

Inject middleware into a module or app. The middleware applies to that specific module/app and any child modules that register it.

```typescript
import { interceptor } from "@minimajs/server";

async function loggerMiddleware() {
  console.log(`[${request().method}] ${request().url}`);
}

// Create injectable middleware
const logger = interceptor.use(loggerMiddleware);

// Option 1: Register on app (applies to all routes)
app.register(logger);

// Option 2: Register in specific module
async function apiModule(app: App) {
  app.register(logger); // Only applies to this module's routes
  app.get("/users", () => "users");
  app.get("/posts", () => "posts");
}
```

**With Filters:**

```typescript
const conditionalLogger = interceptor.use(
  async () => console.log("Logging..."),
  { filter: () => request().url.startsWith("/api") }
);

app.register(conditionalLogger);
```

### 3. Response Interceptor

Transform or decorate response data.

```typescript
// App-level response decorator
app.register(
  interceptor.response((data) => {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
  })
);

// Module-level (only affects this module)
async function apiModule(app: App) {
  app.register(
    interceptor.response((data) => ({
      version: "v1",
      payload: data,
    }))
  );

  app.get("/users", () => ({ users: [] }));
  // Returns: { version: "v1", payload: { success: true, timestamp: "...", data: { users: [] } } }
}
```

**Chaining**: Multiple decorators chain in order of registration.

### 4. Error Interceptor

Handle and format errors.

```typescript
app.register(
  interceptor.error((error) => {
    if (!(error instanceof Error)) throw error;

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  })
);

app.get("/fail", () => abort("Something went wrong", 500));
// Returns: { success: false, error: "Something went wrong", timestamp: "..." }
```

**Module-Scoped Error Handling:**

```typescript
async function apiModule(app: App) {
  app.register(
    interceptor.error((error) => {
      if (!(error instanceof Error)) throw error;
      return { apiError: true, message: error.message };
    })
  );

  app.get("/test", () => abort("API Error"));
}

// Error handling only applies to routes in apiModule
```

## Creating Middleware

A middleware is simply an async function:

```typescript
import { request, headers } from "@minimajs/server";

async function authMiddleware() {
  const token = headers.get("authorization")?.split(" ")[1];
  const user = await validateToken(token);
  setUser(user); // Store in context
}

async function loggerMiddleware() {
  const req = request();
  console.log(`[${req.method}] ${req.url}`);
}
```

## Chaining Middleware

Pass an array to chain multiple middleware:

```typescript
const protectedModule = interceptor(
  [loggerMiddleware, authMiddleware, rateLimitMiddleware],
  async (app) => {
    app.get("/admin", () => "Admin area");
  }
);
```

Middleware executes **in order** from left to right.

## Filtering Middleware

Use `interceptor.filter` for conditional execution:

```typescript
import { interceptor, searchParams } from "@minimajs/server";

const conditionalMiddleware = interceptor.filter(
  async () => {
    console.log("Only runs when filter returns true");
  },
  () => searchParams.get("debug") === "true" // Filter function
);

const module = interceptor([conditionalMiddleware], async (app) => {
  app.get("/test", () => "test");
});
```

## Express Middleware Compatibility

Minima.js is compatible with Express middleware:

```typescript
import cors from "cors";
import helmet from "helmet";

const secureModule = interceptor(
  [cors(), helmet()],
  async (app) => {
    app.get("/api/data", () => ({ data: "secure" }));
  }
);
```

## Module Isolation

**Important**: Interceptors are module-scoped by design.

```typescript
async function moduleA(app: App) {
  app.register(interceptor.response((data) => ({ moduleA: true, data })));
  app.get("/a", () => "A"); // Response: { moduleA: true, data: "A" }
}

async function moduleB(app: App) {
  app.get("/b", () => "B"); // Response: "B" (no decorator)
}

app.register(moduleA);
app.register(moduleB);
```

Module A's response decorator **does not affect** Module B.

## Best Practices

1. **Use module-scoped interceptors** for feature-specific logic
2. **Use `interceptor.use`** for cross-cutting concerns (logging, metrics)
3. **Keep middleware focused** - one responsibility per middleware
4. **Chain middleware thoughtfully** - order matters
5. **Use filters** for conditional logic instead of if statements in middleware
