---
slug: /
sidebar_position: 1
title: "Introduction"
---

# Introduction to Minima.js

Minima.js is a high-performance web framework built from the ground up for modern JavaScript runtimes—no legacy dependencies, no framework wrappers, just pure, optimized code.

## Core Philosophy

Built for developers who value **clean code, type safety, and zero magic**.

### Context Functions

Access request data anywhere without passing context—powered by AsyncLocalStorage:

```typescript
import { createApp } from "@minimajs/server/node";
import { params, searchParams, headers, request } from "@minimajs/server";

const app = createApp();

// Route params - no context needed
app.get("/users/:id", () => {
  const userId = params.get("id");
  return { userId };
});

// Query params with transform function
app.get("/search", () => {
  const query = searchParams.get("q");
  const page = searchParams.get("page", Number) ?? 1; // page type will be infereed as number
  return { query, page };
});

// Native Web API Request object
app.post("/upload", async () => {
  const req = request();
  const formData = await req.formData();
  return { uploaded: true };
});
```

**Extract logic to pure functions:**

```typescript
import { params, headers, abort } from "@minimajs/server";

// Pure functions that use context
function getUser() {
  return User.findById(params.get("id", Number));
}

function isAuthenticated() {
  return headers.get("authorization")?.startsWith("Bearer ");
}

// Compose them anywhere
app.get("/users/:id/posts", async () => {
  if (!isAuthenticated()) {
    abort(401, "Unauthorized");
  }
  const user = await getUser();
  return { user, posts: [] };
});
```

### Hooks: Lifecycle Control

Hooks intercept and transform requests at different lifecycle stages:

```typescript
import { hook } from "@minimajs/server";

// Request hook - runs first, for all requests
app.register(
  hook("request", ({ request }) => {
    console.log(`${request.method} ${request.url}`);

    // Early abort
    if (!request.headers.get("api-key")) {
      abort("Missing API key", "UNAUTHORIZED"); // send 401 error
    }
  })
);

// Transform hook - modify handler response
app.register(
  hook("transform", (data) => {
    if (typeof data === "object") {
      return { ...data, timestamp: Date.now() };
    }
    return data;
  })
);
```

### Runtime-Native Support

Switch runtimes by changing one import—same code, different performance:

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

- **Context functions work everywhere** - params, headers, searchParams, request are runtime-agnostic
- **Module-scoped logic** - extract functions, test them independently
- **Hooks are portable** - define once, works across all runtimes
- **Web API standards** - native Request/Response objects, no custom wrappers

Benefits:

- **Testable** - Extract logic to pure functions
- **Composable** - Module functions work anywhere
- **Type-safe** - Full TypeScript inference
- **Standard** - Web API Request/Response

---

**Minima.js** is a composition-first backend framework where features are built by assembling primitives, not obeying patterns. Context, lifecycle, and schemas are explicit, reusable, and under your control—so your architecture stays intentional, not accidental.
