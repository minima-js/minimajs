# Architecture

Minima.js is designed with a modular and scalable architecture that allows developers to build modern web applications with ease. Unlike most frameworks, **Minima.js is built entirely from scratch**—not layered on top of Express, Fastify, or any other framework. This ground-up approach enables native integration with modern runtimes like Bun while maintaining Node.js compatibility, with zero legacy overhead.

## Complete Lifecycle Flow

Understanding the full lifecycle of a Minima.js application is crucial for building robust applications. The lifecycle consists of two interconnected flows: **Application Lifecycle** and **Request Lifecycle**.

### Application Lifecycle

The application goes through four key phases:

<!--@include: ./diagrams/application-lifecycle.md-->

### Request Lifecycle

Each incoming request flows through multiple stages with three main execution paths:

<!--@include: ./diagrams/request-lifecycle.md-->

### Flow Execution Paths

There are **four main execution paths** for a request:

<!--@include: ./diagrams/flow-execution-paths.md-->

#### 1. Normal Flow (Automatic Serialization)

```
REQUEST → Route Match → Handler (returns data) → TRANSFORM →
Serialize → SEND → Response → SENT → defer()
```

**Example:**

```typescript
app.get("/users", () => {
  return { users: ["Alice", "Bob"] };
});
// Returns data → transformed → serialized → sent -> defer()
```

#### 2. Direct Response Flow (Bypass Hooks)

```
REQUEST → Route Match → Handler (returns Response) → Hook:sent -> defer()
```

**Example:**

```typescript
app.get("/stream", () => {
  return new Response("Direct", { status: 200 });
});
// Skips: TRANSFORM, serialization
```

#### 3. Early Return Flow (Short-Circuit)

```
REQUEST → (returns Response) → SENT -> defer()
```

**Example:**

```typescript
app.register(
  hook("request", ({ request }) => {
    if (request.headers.get("x-maintenance") === "true") {
      return new Response("Maintenance", { status: 503 });
    }
  })
);
// Skips: routing, handler, all other hooks
```

#### 4. Error Flow

```
Any Stage → (error) → ERROR → Serialize Error → Hook:errorSent → onError() -> defer()
```

**Example:**

```typescript
app.get("/error", () => {
  throw new Error("Something broke");
});
// Goes to ERROR hook → error response → ERROR_SENT
```

### Hook Execution Order

Hooks execute in **LIFO** (Last-In-First-Out) order within the same scope:

```typescript
app.register(hook("request", () => console.log("First registered")));
app.register(hook("request", () => console.log("Second registered")));

// Execution order:
// 1. "Second registered"  (last registered, runs first)
// 2. "First registered"   (first registered, runs last)
```

### Encapsulation and Scope Isolation

Each `app.register()` creates an **isolated scope**. Hooks and routes only affect their own scope and child scopes:

<!--@include: ./diagrams/encapsulation.md-->

**Example Code:**

```typescript
const app = createApp();

// Root scope
app.register(hook("request", () => console.log("Root hook")));

app.register(async (app) => {
  // Child scope 1
  app.register(hook("request", () => console.log("Child 1 hook")));
  app.get("/users", () => "users");
  // Executes: Root hook → Child 1 hook
});

app.register(async (app) => {
  // Child scope 2 (isolated from Child 1)
  app.register(hook("request", () => console.log("Child 2 hook")));
  app.get("/admin", () => "admin");
  // Executes: Root hook → Child 2 hook (NOT Child 1 hook)
});
```

### Lifecycle Hook Summary

#### Application Lifecycle Hooks

| Hook       | When                           | Use Case                            |
| ---------- | ------------------------------ | ----------------------------------- |
| `register` | Plugin/module registered       | Track plugin loading                |
| `ready`    | App initialized, before listen | Database connection, config loading |
| `listen`   | Server started listening       | Log server start, notify services   |
| `close`    | Server shutting down           | Cleanup, close DB, flush logs       |

**Special:** `hook.lifespan(fn)` - Combines `ready` (setup) and `close` (cleanup):

```typescript
app.register(
  hook.lifespan(async () => {
    await db.connect(); // Runs on ready
    return async () => {
      await db.disconnect(); // Runs on close
    };
  })
);
```

#### Request Lifecycle Hooks

| Hook        | When                   | Use Case                     | Can Return Response |
| ----------- | ---------------------- | ---------------------------- | ------------------- |
| `request`   | Before route matching  | Auth, logging, rate limiting | ✅ Yes              |
| `transform` | After handler, if data | Transform response data      | ❌ No               |
| `send`      | Before sending         | Add headers, log response    | ✅ Yes              |
| `sent`      | After response sent    | Cleanup, metrics             | ❌ No               |
| `error`     | On error               | Error formatting, logging    | ✅ Yes              |
| `errorSent` | After error sent       | Report to monitoring         | ❌ No               |
| `timeout`   | Request timeout        | Handle timeout               | ✅ Yes              |

**Special Request Hooks:**

- `defer(callback)` - Execute after response sent
- `onError(callback)` - Request-specific error handler

### Performance Considerations

**Fastest to Slowest:**

1. **Direct Response in REQUEST hook** (bypasses everything)
2. **Direct Response in handler** (bypasses transform/serialize)
3. **Return data in handler** (goes through full pipeline)

**Example Performance Optimization:**

```typescript
// Ultra-fast health check (bypasses all processing)
app.register(
  hook("request", ({ request, url }) => {
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }
  })
);

// Fast static response (bypasses transform)
app.get("/ping", () => {
  return new Response("pong", { status: 200 });
});

// Normal response (full pipeline)
app.get("/data", () => {
  return { data: "value" }; // Transform → Serialize → Send
});
```

## Core Architecture

Minima.js is built on three fundamental pillars:

### 1. Native Runtime Integration

Minima.js provides platform-specific imports that leverage native APIs:

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";
// Uses Bun's native HTTP server for maximum performance
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";
// Uses Node.js native HTTP server
```

:::

This approach eliminates abstraction layers and delivers peak performance on each platform.

### 2. Web API Standard

Instead of wrapping Node.js `req`/`res` objects or creating proprietary abstractions, Minima.js uses **native Web API Request/Response**:

- **Request**: Native `Request` object from the Web API
- **Response**: Native `Response` object from the Web API

This means:

- Your code is portable across runtimes
- No learning curve if you know Web APIs
- Future-proof as standards evolve
- Zero overhead from wrapper objects

#### Two Response Modes

Minima.js gives you full control over how responses are handled:

**1. Automatic Serialization (Default)**

Return any JavaScript value and Minima.js will serialize it, apply response hooks, and add global headers:

```typescript
import { createApp } from "@minimajs/server/bun";
import { headers } from "@minimajs/server";

const app = createApp();

app.get("/data", () => {
  // Set global headers
  headers.set("X-Custom-Header", "value");

  // Return plain objects - they go through:
  // 1. Response transformation hooks
  // 2. Global header injection
  // 3. Automatic JSON serialization
  return { message: "Hello, World!", timestamp: Date.now() };
});
```

**2. Direct Response (Bypass Everything)**

Return a native `Response` object to **skip all hooks and global headers**:

```typescript
app.get("/direct", () => {
  // Return native Response - bypasses:
  // ❌ Response transformation hooks
  // ❌ Global headers (immutable Response)
  // ❌ Automatic serialization
  return new Response("Raw response", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
});
```

**Why bypass hooks with native Response?**

- **Performance**: Skip all middleware for critical paths
- **Control**: Full control over headers and body
- **Streaming**: Send streaming responses directly
- **Immutability**: Response objects are immutable - no post-processing

**Comparison:**

| Feature            | Return Object    | Return `new Response()` |
| ------------------ | ---------------- | ----------------------- |
| Response Hooks     | ✅ Applied       | ❌ Skipped              |
| Global Headers     | ✅ Added         | ❌ Immutable            |
| Auto Serialization | ✅ JSON          | ❌ Raw                  |
| Streaming          | ❌ Not supported | ✅ Supported            |
| Performance        | Fast             | Fastest                 |
| Use Case           | 95% of routes    | Streaming, optimization |

::: tip When to use each mode

- Use **automatic serialization** for most routes (hooks, global headers, transforms)
- Use **native Response** when you need complete control or streaming
  :::
