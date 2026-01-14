# Architecture

Minima.js is designed with a **modular, scalable, and runtime-native architecture**. It is built entirely from scratch to enable native integration with modern runtimes like Bun while maintaining full Node.js compatibility, with zero legacy overhead.

## Application & Request Lifecycle

Understanding Minima.js’s lifecycle is key to building robust applications. It consists of two interconnected flows: the global application lifecycle and the per-request processing stages.

For a comprehensive guide to all available hooks, see the [Hooks Guide](/guides/hooks).

### Application Lifecycle

The application passes through four key phases from start to finish.

<!--@include: ./diagrams/application-lifecycle.md-->

### Request Lifecycle

Each incoming request flows through multiple stages with three main execution paths.

<!--@include: ./diagrams/request-lifecycle.md-->

## Hook System

The hook system gives you fine-grained control over the application and request lifecycle.

### Hook Execution Order

Hooks within the same scope execute in **LIFO** (Last-In-First-Out) order:

```ts
app.register(hook("request", () => console.log("First registered")));
app.register(hook("request", () => console.log("Second registered")));

// Execution:
// 1. "First registered" → runs first
// 2. "Second registered" → runs second
```

### Encapsulation and Scope Isolation

Each `app.register()` creates an **isolated scope**. Hooks and routes only affect their own scope and any child scopes, but not sibling or parent scopes.

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
  // Request to /users executes: Root hook → Child 1 hook
});

app.register(async (app) => {
  // Child scope 2 (isolated from Child 1)
  app.register(hook("request", () => console.log("Child 2 hook")));
  app.get("/admin", () => "admin");
  // Request to /admin executes: Root hook → Child 2 hook
});
```

---

## Execution Paths & Performance

There are four primary execution paths a request can take, each with different performance characteristics.

<!--@include: ./diagrams/flow-execution-paths.md-->

### 1. Normal Flow (Automatic Serialization)

This is the standard path where data returned from a handler goes through the full processing pipeline.

```
REQUEST → Route Match → Handler (returns data) → TRANSFORM → Serialize → SEND → ...
```

### 2. Direct Response Flow (Bypass Hooks)

Returning a `Response` object from a handler bypasses the `transform` and serialization steps for higher performance.

```
REQUEST → Route Match → Handler (returns Response) → SEND → ...
```

### 3. Early Return Flow (Short-Circuit)

Returning a `Response` from an early hook (like `request`) terminates the lifecycle immediately. This is the fastest path and is ideal for things like health checks or handling blocked IPs.

```
REQUEST → hook('request') (returns Response) → SEND → ...
```

### 4. Error Flow

When an error is thrown, the normal flow is interrupted, and the `error` hook pipeline is executed.

```
Any Stage → (error) → ERROR → Serialize Error → ...
```

For more details, see the [Error Handling Guide](/guides/error-handling).

### Performance Considerations

**Fastest to Slowest Execution Paths:**

1.  **Direct Response in `request` hook** → Bypasses everything.
2.  **Direct Response in handler** → Bypasses transform & serialization.
3.  **Returning data in handler** → Full pipeline.

```ts
// Ultra-fast health check (Path 3)
app.register(
  hook("request", ({ pathname, responseState }) => {
    if (pathname === "/health") {
      // carry global response
      return new Response("OK", responseState);
    }
  })
);

// Fast static response (Path 2)
app.get("/ping", ({ responseState }) => new Response("pong", responseState));

// Full pipeline (Path 1)
app.get("/data", () => ({ data: "value" }));
```

---

## Core Design Principles

Minima.js is built on three pillars that work together to provide a modern and efficient development experience.

### 1. Native Runtime Integration

Minima.js provides platform-specific imports that leverage **native APIs**, eliminating abstraction layers and delivering peak runtime performance.

::: code-group

```ts [Bun]
import { createApp } from "@minimajs/server/bun";
// Uses Bun's native HTTP server for maximum performance.
```

```ts [Node.js]
import { createApp } from "@minimajs/server/node";
// Uses Node.js's native HTTP server.
```

:::

### 2. Web API Standards

The framework uses **native Web API `Request` and `Response` objects** instead of Node.js-specific abstractions. This makes the API portable, familiar to web developers, and future-proof.

### 3. Modular, Scope-Isolated Design

The combination of scoped `app.register()` and the LIFO hook system enables **scalable, composable applications** with clear lifecycle guarantees. Child scopes inherit from parents, but siblings remain completely isolated.
