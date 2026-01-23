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

## Setup

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

## A Minimal Application

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

This short example already showcases several core concepts. Let's build on this foundation.

> **New to Minima.js?** Check out the [Introduction](/intro) for a conceptual overview before diving into this tutorial.

## Choose Your Runtime

### Bun/Node Compatibility

Minima.js is optimized for both runtimes. You select your target by changing the import path:

- `@minimajs/server/bun`: Uses Bun's native, high-performance `Bun.serve()`.
- `@minimajs/server/node`: Uses Node.js's standard `http.createServer()`.
- `@minimajs/server`: Defaults to the Node.js runtime.

This provides native performance with zero abstraction overhead.

## Access Request Data Anywhere

Notice we imported `params` and used it directly in the route handler without it being passed as an argument:

```typescript
import { params } from "@minimajs/server";

app.get("/hello/:name", () => {
  const name = params.get("name"); // ✅ No req.params.name
  return { message: `Hello, ${name}!` };
});
```

**Available context functions:** `request`, `response`, `params`, `body`, `headers`, `searchParams`

For more details, see the [Http Helpers Guide](/guides/http).

## Organize with File-Based Modules

As your application grows, organize routes by creating `module.ts` files. They're auto-discovered based on folder structure:

```
src/
├── index.ts          # Entry point
├── users/
│   └── module.ts     # → /users/*
└── posts/
    └── module.ts     # → /posts/*
```

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers modules!

await app.listen({ port: 3000 });
```

```typescript [src/users/module.ts]
import { params } from "@minimajs/server";

export default async function (app) {
  app.get("/list", () => [{ id: 1, name: "John" }]);
  app.get("/:id", () => {
    const id = params.get("id");
    return { id, name: "John" };
  });
}
```

:::

**Your API is ready:**
- `GET /users/list`
- `GET /users/:id`
- `GET /posts/list`

**Want to add plugins to a module?** Use `meta.plugins`:

```typescript
import { type Meta, hook } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    hook("request", () => console.log("User route accessed"))
  ]
};

export default async function (app) {
  app.get("/list", () => [/* users */]);
}
```

Learn more: [Module Tutorial](/core-concepts/modules)

## Add Lifecycle Hooks

Use hooks to tap into request/app lifecycle events. Perfect for logging, auth, error handling:

```ts
import { hook } from "@minimajs/server";

// Log every request
app.register(
  hook("request", ({ request, pathname }) => {
    console.log(`[REQ] ${request.method} ${pathname}`);
  })
);
```

**Common hooks:** `request`, `transform`, `send`, `error`, `hook.lifespan`

Learn more: [Hooks Guide](/guides/hooks)

## Handle Errors Centrally

Use an `error` hook to catch all errors in one place:

```ts
import { hook, abort } from "@minimajs/server";

app.register(
  hook("error", (error) => {
    console.error("Error:", error.message);
    abort("Something went wrong!", { status: 500 });
  })
);
```

Learn more: [Error Handling Guide](/guides/error-handling)

## Next Steps

You now have a working Minima.js application! Here's what to explore next:

- **[Module Tutorial](/core-concepts/modules)** - Step-by-step guide to structuring your app
- **[JWT Authentication Recipe](/cookbook/jwt-authentication)** - Add auth in 5 minutes
- **[Hooks Guide](/guides/hooks)** - Master the lifecycle system
- **[Routing Guide](/guides/routing)** - Advanced routing patterns
