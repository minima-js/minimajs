---
title: Getting Started
sidebar_position: 2
tags:
  - concepts
  - core
  - tutorial
---

# Getting Started with Minima.js

This guide introduces the core concepts of Minima.js to get you up and running quickly. We'll start with a minimal application and then explore the key features that make the framework powerful and elegant.

## 1. Setup

First, choose your runtime and create a new project directory.

**Option 1: Bun (Recommended)**

```bash
mkdir minimajs-app
cd minimajs-app
bun init -y
bun add @minimajs/server
```

**Option 2: Node.js**

```bash
mkdir minimajs-app
cd minimajs-app
npm init -y
npm install @minimajs/server
```

If using Node.js, add `"type": "module"` to your `package.json`.

## 2. A Minimal Application

Create a `src/index.ts` file. Here is a very basic Minima.js application:

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";
import { params, body } from "@minimajs/server";

const app = createApp();

// Simple functional route
app.get("/", () => ({ message: "Hello, World!" }));

// Demonstrates context-aware access to route parameters
app.get("/hello/:name", () => {
  const name = params.get("name");
  return { message: `Hello, ${name}!` };
});

const { address } = await app.listen({ port: 3000 });
console.log(`Server listening on ${address}`);
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";
import { params, body } from "@minimajs/server";

const app = createApp();

// Simple functional route
app.get("/", () => ({ message: "Hello, World!" }));

// Demonstrates context-aware access to route parameters
app.get("/hello/:name", () => {
  const name = params.get("name");
  return { message: `Hello, ${name}!` };
});

const { address } = await app.listen({ port: 3000 });
console.log(`Server listening on ${address}`);
```

:::

This short example already showcases several core concepts we will explore next.

## Core Concepts

### Bun/Node Compatibility

Minima.js is optimized for both runtimes. You select your target by changing the import path:

-   `@minimajs/server/bun`: Uses Bun's native, high-performance `Bun.serve()`.
-   `@minimajs/server/node`: Uses Node.js's standard `http.createServer()`.
-   `@minimajs/server`: Defaults to the Node.js runtime.

This provides native performance with zero abstraction overhead.

### Context-Aware Functions

Notice we imported `params` and used it directly in the route handler without it being passed as an argument. This is Minima.js's **context-aware API**, powered by `AsyncLocalStorage`.

It allows you to access request-specific data from anywhere in your application's call stack, leading to cleaner, more readable code. You no longer need to pass `req` or `ctx` objects through layers of functions.

Key context functions include: `request`, `response`, `params`, `body`, `headers`, and `searchParams`.

### Web-Native APIs (Request, Response)

Minima.js is built on the standard Web APIs, primarily `Request` and `Response`.

You can access the native `Request` object at any time:

```ts
import { request } from "@minimajs/server";

app.get("/info", () => {
  const req = request();
  return { userAgent: req.headers.get("user-agent") };
});
```

#### Short-Circuiting

If you return a `Response` object directly from a handler, Minima.js performs a **short-circuit**. It immediately sends the response, bypassing all subsequent processing (like `transform` hooks and serialization). This is a powerful tool for performance-critical paths.

```ts
app.get("/fast", () => {
  // Bypasses everything, sends response immediately
  return new Response("This is a raw, fast response", {
    headers: { "Content-Type": "text/plain" },
  });
});
```

### Encapsulation and Modules

Minima.js allows you to structure your application into encapsulated modules. When you register a module with `app.register()`, it creates an isolated scope. Hooks and plugins registered inside a module only affect that module and its children.

```ts
import { type App } from "@minimajs/server";

async function userModule(app: App) {
  // This hook is local to userModule ONLY
  app.register(hook("request", () => console.log("Inside user module")));
  app.get("/users", () => [
    /* ... */
  ]);
}

const app = createApp();
// The root app is not affected by userModule's hooks
app.register(userModule, { prefix: "/api/v1" });
```

### Lifecycle Hooks

Hooks allow you to tap into any stage of the application or request lifecycle. This is perfect for middleware, logging, authentication, and error handling.

This example uses a `request` hook to log every incoming request:

```ts
import { hook } from "@minimajs/server";

app.register(
  hook("request", ({ request, url }) => {
    console.log(`[REQ] ${request.method} ${url.pathname}`);
  })
);
```

### Custom Request-Scoped Data (`createContext`)

For advanced use cases, you can create your own request-scoped context to share data. This is ideal for storing user authentication status or other per-request data.

```ts
import { createContext, hook } from "@minimajs/server";

// 1. Create a context with a getter and setter
const [getUser, setUser] = createContext<User | null>(null);

// 2. Use a hook to set the context for each request
app.register(
  hook("request", async () => {
    const user = await getUserFromToken(headers.get("authorization"));
    setUser(user);
  })
);

// 3. Access the data anywhere in your application
app.get("/profile", () => {
  const user = getUser(); // Returns the user for the current request
  if (!user) throw new Error("Unauthorized");
  return { user };
});
```

### Error Handling

Centralized error handling can be achieved with an `error` hook. This keeps your route handlers clean and focused on the happy path.

```ts
import { hook, abort } from "@minimajs/server";

app.register(
  hook("error", (error, _ctx) => {
    console.error("Caught error:", error.message);
    // Standardize error responses
    abort({ code: "INTERNAL_ERROR", message: error.message }, 500);
  })
);
```

## Next Steps

You now have an overview of the most important concepts in Minima.js. To learn more, explore these resources:

-   **[Core Concepts](/core-concepts/architecture)**: Learn about the fundamental architecture.
-   **[Guides](/guides/routing)**: Dive deeper into routing, middleware, and hooks.
-   **[Packages](/packages/auth)**: Discover additional packages for authentication, data validation, and more.
