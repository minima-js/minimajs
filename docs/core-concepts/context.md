---
title: Context
sidebar_position: 3
tags:
  - context
  - async-local-storage
---

# Context: Access Data from Anywhere

In many Node.js frameworks, you need to pass `request` and `response` objects down through your application's layers. This "prop drilling" can lead to cluttered code and tight coupling.

Minima.js solves this with a powerful **Context** system, powered by Node.js's native `AsyncLocalStorage` API. Each request gets its own context, and you can access request-specific data from **anywhere** in your code without passing `req` or `res`.

## Access the Full Request Context with `context()`

Use `context()` when you need the complete request scope in one object. It exposes the request, response state, route info, and per-request locals.

```typescript
import { context } from "@minimajs/server";

function auditRequest() {
  const ctx = context();
  const method = ctx.request.method;
  const path = ctx.pathname;
  const routeName = ctx.route?.path ?? "unknown";

  console.log(`[AUDIT] ${method} ${path} (${routeName})`);
}

export default async function (app) {
  app.get("/users/:id", () => {
    auditRequest();
    return { id: "123" };
  });
}
```

**Common fields on `context()`:**

- `request` - native Web API `Request`
- `responseState` - mutable headers/status
- `pathname` - current request path
- `route` - matched route (if any)
- `locals` - per-request storage

> **Note:** `context()` only works inside a request lifecycle. Calling it outside a request will throw.

## Create Your Own Context with `createContext`

To create custom request-scoped storage, use the `createContext` function from `@minimajs/server`.

```typescript
import { createContext } from "@minimajs/server";

// Create a context to store a request-specific trace ID
const [getTraceId, setTraceId] = createContext<string>("");
```

This returns a tuple with a **getter** (`getTraceId`) and a **setter** (`setTraceId`).

Here's how you might use it to apply a `traceId` to every request using a middleware plugin.

```typescript
import { createApp, hook } from "@minimajs/server";
import { randomUUID } from "crypto";

// 1. Define a hook plugin that runs on every request.
const traceIdPlugin = hook("request", () => {
  const traceId = randomUUID();
  setTraceId(traceId);
});

function someDeeplyNestedFunction() {
  // 3. We can access the trace ID here without any prop drilling!
  const traceId = getTraceId();
  console.log(`Trace ID: ${traceId}`);
}

async function mainModule(app) {
  app.get("/", () => {
    someDeeplyNestedFunction();
    return { message: "Hello, World!" };
  });
}

const app = createApp();
// 2. Apply the middleware plugin to your app.
app.register(traceIdPlugin);

app.register(mainModule);
await app.listen({ port: 3000 });
```

As you can see, `someDeeplyNestedFunction` can access the `traceId` without having it passed as a parameter.

## Benefits of Using Context

- **Cleaner Code:** Eliminates the need to pass `req` and `res` everywhere.
- **Decoupling:** Your business logic doesn't need to be aware of the underlying HTTP framework.
- **Easier Third-Party Integration:** Integrate libraries that don't have direct access to `req`/`res` objects.
- **Improved Testability:** Your functions become easier to test in isolation.
