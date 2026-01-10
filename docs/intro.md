---
slug: /
sidebar_position: 1
title: "Introduction"
---

# Introduction to Minima.js

Minima.js is a **TypeScript-first, high-performance web framework** built for modern JavaScript runtimes like **Node.js** and **Bun**. It avoids legacy abstractions and framework wrappers in favor of **pure ESM, Web-native APIs, and minimal, explicit primitives —** giving you performance, portability, and clarity without hidden behavior.

### Context Functions

Access request data anywhere without passing context—powered by `AsyncLocalStorage`. This allows your functions to be pure and easily testable, pulling request-specific information only when needed.

```typescript
import { createApp } from "@minimajs/server/node";
import { params, searchParams, headers, request, abort } from "@minimajs/server";

const app = createApp();

// Route params - accessible from anywhere within the request context
app.get("/users/:id", () => {
  const userId = params.get("id");
  return { userId };
});

// Query params with type coercion
app.get("/search", () => {
  const query = searchParams.get("q");
  const page = searchParams.get("page", Number) ?? 1; // page type will be inferred as number
  return { query, page };
});

// Native Web API Request object - for full control
app.post("/upload", async () => {
  const req = request();
  const formData = await req.formData();
  return { uploaded: true };
});
```

**Extract logic to pure functions:**

```typescript
import { params, headers, abort } from "@minimajs/server";

// Pure functions that leverage Minima.js's context
function getUser() {
  // Assuming User.findById exists and uses context
  return User.findById(params.get("id", Number));
}

function isAuthenticated() {
  return headers.get("authorization")?.startsWith("Bearer ");
}

// Compose them anywhere for clean, readable logic
app.get("/users/:id/posts", async () => {
  if (!isAuthenticated()) {
    abort(401, "Unauthorized"); // Use abort for early exit with an error response
  }
  const user = await getUser();
  return { user, posts: [] };
});
```

### Hooks: Lifecycle Control

Hooks allow you to intercept and transform requests and application events at different lifecycle stages. They are central to implementing cross-cutting concerns like authentication, logging, and data transformation.

For a comprehensive guide, see the [Hooks Guide](/guides/hooks).

```typescript
import { hook } from "@minimajs/server";

// Example: A request hook for logging
app.register(
  hook("request", ({ request }) => {
    console.log(`${request.method} ${request.url}`);
  })
);

// Example: A transform hook to modify response data
app.register(
  hook("transform", (data) => {
    if (typeof data === "object") {
      return { ...data, timestamp: Date.now() };
    }
    return data;
  })
);
```

> For details on error handling hooks and the `abort` helper, refer to the [Error Handling Guide](/guides/error-handling).

### Runtime-Native Support

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

- **Context functions work everywhere** - `params`, `headers`, `searchParams`, `request` are runtime-agnostic.
- **Module-scoped logic** - extract functions, test them independently.
- **Hooks are portable** - define once, works across all runtimes.
- **Web API standards** - native `Request`/`Response` objects, no custom wrappers.

Benefits:

- **Testable** - Extract logic to pure functions.
- **Composable** - Module functions work anywhere.
- **Type-safe** - Full TypeScript inference.
- **Standard** - Web API `Request`/`Response`.

---

**Minima.js** is a composition-first backend framework where features are built by assembling primitives, not obeying patterns. Context, lifecycle, and schemas are explicit, reusable, and under your control—so your architecture stays intentional, not accidental.
