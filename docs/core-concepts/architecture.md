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
// Returns data → transformed → serialized → sent
```

#### 2. Direct Response Flow (Bypass Hooks)

```
REQUEST → Route Match → Handler (returns Response) → SEND → SENT
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
REQUEST → (returns Response) → SEND → SENT
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
Any Stage → (error) → ERROR → Serialize Error → Send → ERROR_SENT → onError()
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
| `send`      | Before sending         | Add headers, log response    | ❌ No               |
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

### 3. Hook-Based Control System

The request lifecycle is managed through a powerful hook system that gives you surgical control at every stage:

```
Incoming Request (Web API Request)
      │
      ▼
┌─────────────┐
│ Request Hook│  ← Intercept incoming requests
└─────────────┘
      │
      ▼
┌─────────────┐
│  Router     │  ← Match URL to handler
└─────────────┘
      │
      ▼
┌─────────────┐
│  Context    │  ← AsyncLocalStorage-based context
└─────────────┘
      │
      ▼
┌─────────────┐
│Route Handler│  ← Your application logic
└─────────────┘
      │
      ▼
┌─────────────┐
│Response Hook│  ← Transform responses
└─────────────┘
      │
      ▼
┌─────────────┐
│  Error Hook │  ← Handle errors
└─────────────┘
      │
      ▼
Outgoing Response (Web API Response)
```

### The Hook System

Hooks are simple functions that execute at specific lifecycle points:

```typescript
import { createApp } from "@minimajs/server/bun";
import { hook } from "@minimajs/server";

const app = createApp();

// Request hook - runs before routing
app.register(
  hook("request", ({ request }) => {
    console.log(`${request.method} ${request.url}`);
  })
);

// Response hook - transforms responses
app.register(
  hook("response", ({ response }) => {
    response.headers.set("X-Powered-By", "Minima.js");
    return response;
  })
);

// Error hook - custom error handling
app.register(
  hook("error", (ctx) => {
    console.error(ctx.error);
    return { error: ctx.error.message, code: 500 };
  })
);
```

#### Early Returns: Short-Circuit the Lifecycle

Hooks can **return a Response** to short-circuit the entire request lifecycle:

```typescript
import { createApp } from "@minimajs/server/bun";
import { hook } from "@minimajs/server";

const app = createApp();

// Request hook that short-circuits
app.register(
  hook("request", ({ request }) => {
    // Return Response from request hook - SKIPS EVERYTHING:
    // ❌ Router matching
    // ❌ Route handler execution
    // ❌ Response hooks
    // ❌ Error handling
    if (request.headers.get("x-maintenance") === "true") {
      return new Response("Maintenance mode", { status: 503 });
    }
    // Return nothing - continue to next hook/handler
  })
);

app.get("/api/data", () => {
  // This handler is SKIPPED if request hook returns Response
  return { data: "Hello" };
});
```

**Use cases for early returns:**

- **Rate limiting**: Block requests before routing
- **Authentication**: Reject unauthorized requests immediately
- **Maintenance mode**: Return 503 without touching handlers
- **Caching**: Return cached responses before handler execution
- **Edge cases**: Handle special requests (health checks, robots.txt) early

::: warning Important
When a hook returns a `Response`, the entire request lifecycle is bypassed. Use this for performance-critical early exits, but remember that response hooks won't run.
:::

#### Complete Lifecycle Flow

Understanding the full request lifecycle with early returns and response modes:

```typescript
import { createApp } from "@minimajs/server/bun";
import { hook, headers } from "@minimajs/server";

const app = createApp();

// 1. Request Hook (can short-circuit)
app.register(
  hook("request", ({ request }) => {
    console.log("1. Request hook");

    if (request.url.includes("/health")) {
      // Early return - skips steps 2-6
      return new Response("OK", { status: 200 });
    }
    // Continue to step 2
  })
);

// 2. Router matches URL to handler
// 3. Handler executes
app.get("/data", () => {
  console.log("3. Handler executed");

  // Option A: Return object (continues to step 4-6)
  return { data: "processed" };

  // Option B: Return Response (skips step 4-6)
  // return new Response(JSON.stringify({ data: 'raw' }));
});

// 4. Response Hook (only if handler returned non-Response)
app.register(
  hook("response", (ctx) => {
    console.log("4. Response hook - transform response");
    return ctx.response;
  })
);

// 5. Global Headers Applied (only for non-Response returns)
// 6. Serialization (only for non-Response returns)
```

**Three possible execution paths:**

1. **Normal flow**: Request hook → Router → Handler (object) → Response hook → Headers → Serialize
2. **Early hook return**: Request hook (Response) → **DONE**
3. **Direct response**: Request hook → Router → Handler (Response) → **DONE**

This gives you maximum flexibility: use automatic pipeline for convenience, or bypass it for performance.

### The Context System

Every route handler and hook receives a `Context` object with request data. But Minima.js goes further—you can access context from **anywhere** using AsyncLocalStorage:

```typescript
import { createApp } from "@minimajs/server/bun";
import { params, body, request } from "@minimajs/server";

const app = createApp();

// Approach 1: Via Context parameter
app.post("/users/:id", (ctx) => {
  const id = ctx.route.params.id;
  const userData = ctx.body;
  return { id, userData };
});

// Approach 2: Via AsyncLocalStorage (recommended)
app.post("/users/:id", () => {
  const id = params.get("id");
  const userData = body(); // Automatically typed
  const url = request().url; // Native Web API Request

  return { id, userData, url };
});
```

**Why AsyncLocalStorage context is powerful:**

```typescript
// Define helper functions that access context
function getCurrentUser() {
  const token = request().headers.get("authorization");
  return decodeToken(token);
}

function logRequest() {
  const req = request();
  console.log(`${req.method} ${req.url}`);
}

// Use them in handlers without passing context around
app.get("/profile", () => {
  logRequest(); // No parameters needed!
  const user = getCurrentUser(); // Context accessed internally
  return { user };
});
```

No need to pass `req` and `res` objects around. The context is available wherever you need it, accessible via either the explicit Context parameter or clean AsyncLocalStorage-based imports.

## Modular Structure

Minima.js encourages a modular approach to building applications. You can structure your application as a collection of modules, where each module is responsible for a specific feature or set of related features. This makes your application easier to maintain and scale.

A typical Minima.js application has the following directory structure:

```
.
├── src
│   ├── index.ts         // Entry point
│   └── user             // User module
│       └── index.ts     // User module entry point
└── package.json
```

In this structure, the `user` directory is a module that contains all the code related to the user feature. The `index.ts` file in the `user` directory is the entry point for the module and is responsible for defining the routes and other components of the module.
