---
slug: /
sidebar_position: 1
title: "Introduction"
---

# Introduction to Minima.js

Minima.js is a **TypeScript-first, high-performance web framework** built from scratch for modern JavaScript runtimes like **Node.js** and **Bun**. Built on battle-tested libraries like find-my-way and avvio, it combines production-ready reliability with a **clean, modern API** that embraces **file-based modules, context-aware design, and Web standards** — giving you performance and clarity without hidden behavior.

## Core Concepts

Minima.js is built around four key ideas:

1. **Runtime-Native Support** - Built from scratch for Bun and Node.js with zero abstractions
2. **File-Based Modules** - Your folder structure defines your API structure
3. **Context Functions** - Access request data anywhere without prop drilling
4. **Everything is a Plugin** - Hooks, middleware, auth—all follow the same pattern

Let's explore each one.

---

## Runtime-Native Support

Minima.js is designed for native integration with modern JavaScript runtimes like Bun and Node.js. You can switch between runtimes by changing a single import, ensuring optimal performance without abstraction overhead.

::: code-group

```typescript [Bun (Native)]
import { createApp } from "@minimajs/server/bun"; // [!code highlight]
import { params, headers } from "@minimajs/server";

const app = createApp();

app.get("/api/:resource", () => {
  const resource = params.get("resource");
  const apiKey = headers.get("x-api-key");

  return { resource, apiKey };
});

await app.listen({ port: 3000 });
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node"; // [!code highlight]
import { params, headers } from "@minimajs/server";

const app = createApp();

app.get("/api/:resource", () => {
  const resource = params.get("resource");
  const apiKey = headers.get("x-api-key");

  return { resource, apiKey };
});

await app.listen({ port: 3000 });
```

:::

**Key Advantages:**

- **One import to switch** - Change `/bun` to `/node` (or vice versa) and you're done
- **Zero abstraction overhead** - Direct access to `Bun.serve()` or native Node.js HTTP
- **No compatibility layers** - Not a legacy framework ported to modern runtimes
- **Runtime-optimized** - Each import is tailored for its runtime's strengths

**Why this matters:**

- Your code runs at native speed with no framework overhead
- Easy to test across runtimes in CI/CD
- Future-proof as new runtimes emerge
- Full control over runtime-specific features when needed

---

## File-Based Modules

Instead of manually importing and registering routes, Minima.js **automatically discovers modules** from your file structure. Create a file, get a route.

### Auto-Discovery

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Discovers all modules automatically

await app.listen({ port: 3000 });
```

```typescript [src/users/module.ts]
import type { Routes } from "@minimajs/server";

function getUsers() {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
}

export const routes: Routes = {
  "GET /list": getUsers,
};
// ✅ Auto-loaded as /users/*
```

```typescript [src/posts/module.ts]
import type { Routes } from "@minimajs/server";

function getLatestPosts() {
  return { posts: [] };
}

export const routes: Routes = {
  "GET /latest": getLatestPosts,
};
// ✅ Auto-loaded as /posts/*
```

:::

**File structure = API structure:**

- `src/users/module.ts` → `/users/*`
- `src/posts/module.ts` → `/posts/*`
- `src/api/v1/users/module.ts` → `/api/v1/users/*`

No imports. No registration. Just create files.

### Module Plugins with `meta.plugins`

Each module can declare its own plugins—hooks, middleware, auth—all in one place:

::: code-group

```typescript [src/users/module.ts]
import type { Meta, Routes } from "@minimajs/server";
import { hook } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

export const meta: Meta = {
  plugins: [cors({ origin: "https://example.com" }), hook("request", () => console.log("User route accessed"))],
};

function getUsers() {
  return [
    /* users */
  ];
}

export const routes: Routes = {
  "GET /list": getUsers,
};
```

:::

**Benefits:**

- **Declarative** - See what affects each module at the top
- **Scoped** - Plugins only affect this module and its children
- **Isolated** - Siblings don't interfere with each other
- **Testable** - Easy to mock plugins for testing

### Root Module for Global Config

Create `src/module.ts` to configure ALL modules:

::: code-group

```typescript [src/module.ts]
import { handler, type Meta, type Routes } from "@minimajs/server";
import { internal } from "@minimajs/openapi";
import { cors } from "@minimajs/server/plugins";
import { authPlugin } from "./plugins/auth.js";

// Root module - plugins apply to EVERY route
export const meta: Meta = {
  prefix: "/api",
  plugins: [
    authPlugin, // Global authentication
    cors({ origin: "*" }), // Global CORS
  ],
};

// to attach route meta descriptors, use handler function
// handler(...descriptors, handle)
const health = handler(internal(), () => {
  return { status: "ok" };
});

export const routes: Routes = {
  "GET /health": health,
};
```

```typescript [src/users/module.ts]
import type { Routes } from "@minimajs/server";

function getUsers() {
  return [
    /* users */
  ];
}

// Automatically inherits authPlugin and CORS from root
export const routes: Routes = {
  "GET /list": getUsers,
};
// ✅ /api/users/list (has auth + CORS from root)
```

:::

**Perfect for:**

- Global authentication
- Body parsing
- CORS configuration
- Rate limiting
- Request logging

> **Learn more:** [Full module tutorial →](/core-concepts/modules)

---

## Context Functions

Access request data anywhere without passing context—powered by `AsyncLocalStorage`. This allows your functions to be pure and easily testable, pulling request-specific information only when needed.

```typescript [src/api/module.ts]
import { params, searchParams, request, abort } from "@minimajs/server";
import type { Routes } from "@minimajs/server";

function getUserById() {
  const userId = params.get("id");
  return { userId };
}

function search() {
  const query = searchParams.get("q");
  const page = searchParams.get("page", Number) ?? 1; // page type will be inferred as number
  return { query, page };
}

async function uploadFile() {
  const req = request();
  const formData = await req.formData();
  return { uploaded: true };
}

export const routes: Routes = {
  // Route params - accessible from anywhere within the request context
  "GET /users/:id": getUserById,

  // Query params with type coercion
  "GET /search": search,

  // Native Web API Request object - for full control
  "POST /upload": uploadFile,
};
```

**Extract logic to pure functions:**

```typescript [src/api/module.ts]
import { params, headers, abort } from "@minimajs/server";
import type { Routes } from "@minimajs/server";

// Pure functions that leverage Minima.js's context
function getUser() {
  // Assuming User.findById exists and uses context
  return User.findById(params.get("id", Number));
}

function isAuthenticated() {
  return headers.get("authorization")?.startsWith("Bearer ");
}

async function getUserPosts() {
  if (!isAuthenticated()) {
    abort(401, "Unauthorized"); // Use abort for early exit with an error response
  }
  const user = await getUser();
  return { user, posts: [] };
}

export const routes: Routes = {
  // Compose them anywhere for clean, readable logic
  "GET /users/:id/posts": getUserPosts,
};
```

## Hooks & Plugins

**In Minima.js, everything is a plugin** - even hooks are plugins. Apply them via `meta.plugins` in your modules.

### Registering Hooks

::: code-group

```typescript [src/api/module.ts]
import type { Meta, Routes } from "@minimajs/server";
import { hook } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    // Request hook for logging
    hook("request", ({ request, pathname }) => {
      console.log(`${request.method} ${pathname}`);
    }),

    // Transform hook to modify response data
    hook("transform", (data) => {
      if (typeof data === "object") {
        return { ...data, timestamp: Date.now() };
      }
      return data;
    }),
  ],
};

function getData() {
  return { value: "test" };
}

export const routes: Routes = {
  "GET /data": getData,
  // Response: { "value": "test", "timestamp": 1234567890 }
};
```

:::

**Available hooks:**

- **`request`** - Before route matching (auth, rate limiting)
- **`transform`** - Modify response data before serialization
- **`send`** - After response sent (logging, cleanup)
- **`error`** - Handle errors
- **`timeout`** - Handle request timeouts

**Application lifecycle hooks:**

- **`hook.lifespan`** - Setup/teardown (database connections)
- **`ready`** - When app is ready
- **`listen`** - When server starts
- **`close`** - When app shuts down

> **Learn more:** [Hooks Guide](/guides/hooks) | [Error Handling](/guides/error-handling)

---

## Summary

**Minima.js** gives you four superpowers:

1. **Runtime-native** - Built for Bun and Node.js with zero overhead
2. **File-based modules** - Structure your app naturally, no wiring needed
3. **Context everywhere** - Access request data from any function
4. **Plugin-based everything** - Compose behavior with `meta.plugins`

Together, these create a framework where your architecture stays intentional, not accidental—and your code stays clean, not cluttered.

**Ready to start building?** → [Getting Started Guide](/getting-started)
