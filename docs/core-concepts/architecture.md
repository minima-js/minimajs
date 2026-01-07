# Architecture

Minima.js is designed with a **modular, scalable, and runtime-native architecture**, enabling developers to build modern web applications with ease. Unlike most frameworks, **Minima.js is built entirely from scratch**—it does not rely on Express, Fastify, or any other framework. This ground-up approach allows **native integration with modern runtimes like Bun** while maintaining full **Node.js compatibility**, with zero legacy overhead.

---

## Complete Lifecycle Flow

Understanding Minima.js’s lifecycle is key to building robust applications. It consists of **two interconnected flows**:

1. **Application Lifecycle** – Global phases of the application.
2. **Request Lifecycle** – Per-request processing stages.

### Application Lifecycle

The application passes through **four key phases**:

<!--@include: ./diagrams/application-lifecycle.md-->

---

### Request Lifecycle

Each incoming request flows through multiple stages with **three main execution paths**:

<!--@include: ./diagrams/request-lifecycle.md-->

---

### Flow Execution Paths

There are **four primary execution paths** for a request:

<!--@include: ./diagrams/flow-execution-paths.md-->

#### 1. Normal Flow (Automatic Serialization)

```
REQUEST → Route Match → Handler (returns data) → TRANSFORM →
Serialize → SEND → Response → SENT → defer()
```

**Example:**

```ts
app.get("/users", () => {
  return { users: ["Alice", "Bob"] };
});
// Full pipeline: transformed → serialized → sent → deferred
```

---

#### 2. Direct Response Flow (Bypass Hooks)

```
REQUEST → Route Match → Handler (returns Response) → Hook:sent → defer()
```

**Example:**

```ts
app.get("/stream", () => {
  return new Response("Direct", { status: 200 });
});
// Skips: TRANSFORM, serialization
```

---

#### 3. Early Return Flow (Short-Circuit)

```
REQUEST → (returns Response) → SENT → defer()
```

**Example:**

```ts
app.register(
  hook("request", ({ request }) => {
    if (request.headers.get("x-maintenance") === "true") {
      return new Response("Maintenance", { status: 503 });
    }
  })
);
// Skips: routing, handler, all other hooks
```

---

#### 4. Error Flow

```
Any Stage → (error) → ERROR → Serialize Error → Hook:errorSent → onError() → defer()
```

**Example:**

```ts
app.get("/error", () => {
  throw new Error("Something broke");
});
// Goes to ERROR hook → serialized error → errorSent → onError
```

---

### Hook Execution Order

Hooks within the same scope execute in **LIFO** (Last-In-First-Out) order:

```ts
app.register(hook("request", () => console.log("First registered")));
app.register(hook("request", () => console.log("Second registered")));

// Execution:
// 1. "Second registered" → runs first
// 2. "First registered" → runs last
```

---

### Encapsulation and Scope Isolation

Each `app.register()` creates an **isolated scope**. Hooks and routes only affect their own scope and **child scopes**:

<!--@include: ./diagrams/encapsulation.md-->

**Example:**

```ts
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

---

### Lifecycle Hook Summary

#### Application Lifecycle Hooks

| Hook       | When                           | Use Case                      |
| ---------- | ------------------------------ | ----------------------------- |
| `register` | Plugin/module registration     | Track plugin loading          |
| `ready`    | App initialized, before listen | Connect to DB, load config    |
| `listen`   | Server starts listening        | Log startup, notify services  |
| `close`    | Server shutdown                | Cleanup resources, flush logs |

**Special:** `hook.lifespan(fn)` combines **setup** (`ready`) and **cleanup** (`close`):

```ts
app.register(
  hook.lifespan(async () => {
    await db.connect(); // Runs on ready
    return async () => {
      await db.disconnect(); // Runs on close
    };
  })
);
```

---

#### Request Lifecycle Hooks

| Hook        | When                   | Use Case                     | Can Return Response |
| ----------- | ---------------------- | ---------------------------- | ------------------- |
| `request`   | Before route matching  | Auth, logging, rate limiting | ✅ Yes              |
| `transform` | After handler, if data | Transform response data      | ❌ No               |
| `send`      | Before sending         | Add headers, log response    | ✅ Yes              |
| `sent`      | After response sent    | Cleanup, metrics             | ❌ No               |
| `error`     | On error               | Format/log errors            | ✅ Yes              |
| `errorSent` | After error sent       | Report to monitoring         | ❌ No               |
| `timeout`   | Request timeout        | Handle request timeouts      | ✅ Yes              |

**Special Request Hooks:**

- `defer(callback)` – Run **after response** is sent
- `onError(callback)` – Request-specific error handling

---

### Performance Considerations

**Fastest to Slowest Execution Paths:**

1. **Direct Response in `request` hook** → bypasses everything
2. **Direct Response in handler** → bypasses transform & serialize
3. **Returning data in handler** → full pipeline

**Examples:**

```ts
// Ultra-fast health check
app.register(
  hook("request", ({ url }) => {
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }
  })
);

// Fast static response
app.get("/ping", () => new Response("pong", { status: 200 }));

// Full pipeline
app.get("/data", () => ({ data: "value" })); // Transform → Serialize → Send
```

---

## Core Architecture

Minima.js is built on **three pillars**:

### 1. Native Runtime Integration

Minima.js provides platform-specific imports leveraging **native APIs**:

::: code-group

```ts [Bun]
import { createApp } from "@minimajs/server/bun";
// Uses Bun's native HTTP server for maximum performance
```

```ts [Node.js]
import { createApp } from "@minimajs/server/node";
// Uses Node.js native HTTP server
```

:::

This eliminates abstraction layers and delivers **peak runtime performance**.

---

### 2. Web API Standard

Minima.js uses **native Web API `Request` and `Response` objects**:

- **Request**: Native Web API `Request`
- **Response**: Native Web API `Response`

Benefits:

- Portable across runtimes
- Familiar API for Web developers
- Future-proof and standard-compliant
- Zero wrapper overhead

---

### 3. Modular, Scope-Isolated Design

- **Scoped `app.register()`** allows isolated routes and hooks
- **LIFO hook execution** ensures predictable order
- **Child scopes inherit parent hooks** but remain isolated from sibling scopes

This modular design enables **scalable, composable applications** with clear lifecycle guarantees.
