---
title: Error Handling
sidebar_position: 6
tags:
  - error
  - exception
  - abort
  - redirect
  - hooks
---

# Error Handling

Proper error handling is crucial for building robust and reliable web applications. Minima.js provides a flexible and powerful error handling mechanism centered around hooks and helpers that allows you to manage errors in a predictable and structured way.

By default, if an exception is uncaught in your route handlers, Minima.js sends a generic `500 Internal Server Error` response.

## Throwing Errors

The primary way to signal an error in Minima.js is to `throw` an `Error` or use the `abort` helper.

### The `abort` Helper

To make it easy to throw HTTP-specific errors, Minima.js provides an `abort` helper function. This function throws an `HttpError` internally. You can also check if an error was created by `abort` using `abort.is(error)`.

```typescript
import { abort, params } from "@minimajs/server";

app.get("/users/:id", () => {
  const { id } = params<{ id: string }>();
  const user = findUserById(id);

  if (!user) {
    // Aborts with a 404 Not Found status and a JSON body
    abort({ error: "User not found" }, 404);
  }

  return user;
});
```

You can also use the shorthand `abort.notFound()`:

```typescript
if (!user) {
  abort.notFound("User not found"); // Aborts with 404
}
```

### The `redirect` Helper

To redirect a client, use the `redirect` helper. This throws a special error that the framework intercepts to generate a `302` (temporary) or `301` (permanent) redirect response.

```typescript
import { redirect } from "@minimajs/server";

app.get("/old-path", () => {
  redirect("/new-path", true); // 301 permanent redirect
});
```

## Handling Errors with Hooks

The most powerful way to handle errors is through lifecycle hooks.

### `error` Hook Behavior

When an error is thrown, Minima.js looks for registered `error` hooks to handle it. The hook signature is `(error: unknown, ctx: Context) => Response | object | void`. Your hook can have one of four outcomes:

1.  **Customize the error and re-throw**: The recommended approach. Use `abort()` or `throw new HttpError()` to create a new, customized error. This allows other `error` hooks to process it and lets the framework handle final serialization, including applying CORS and other headers.
2.  **Return data (e.g., an object)**: The error is considered "handled," and the returned data is sent as a **successful `200 OK` response**. The error handling chain stops.
3.  **Return a `Response` object**: The error chain stops, and the `Response` is sent directly to the client. **Use this with caution**, as it bypasses all other framework logic, including CORS headers and `send` hooks.
4.  **Do nothing (return `undefined`)**: The error is passed to the next `error` hook. If there are no more hooks, a generic 500 error is sent.

```mermaid
graph TD
    subgraph Request Lifecycle
        A[Request] --> B{Route Handler};
        B --> C{Error Thrown!};
    end

    C --> D{Error Hook 1};
    D --> |1. Throws new HttpError / abort()| G{Error Hook 2};
    D --> |2. Returns data| F[Serialize data as 200 OK];
    D --> |3. Returns Response obj| E[Send Response Directly (Bypasses CORS)];
    D --> |4. Returns undefined| G;

    G --> |...| H[Send Final Error Response];

    style C fill:#ffcdd2
    style E fill:#ffe0b2
    style F fill:#c8e6c9
    style H fill:#ffcdd2
```

### Global Error Handler

To create a global error handler, register an `error` hook at the root of your application.

```typescript
import { hook, abort } from "@minimajs/server";
import type { Context } from "@minimajs/server";

app.register(
  hook("error", (error: unknown, ctx: Context) => {
    // Log the original error
    console.error("Global error occurred:", error);

    // Use abort.is() to check if it's an HttpError and access statusCode
    if (abort.is(error) && error.statusCode === 404) {
      abort({ code: "NOT_FOUND", message: "The requested resource was not found." }, 404);
    }

    // For all other errors, send a generic 500 error
    abort({ code: "INTERNAL_ERROR", message: "Something went terribly wrong!" }, 500);
  })
);
```

### Module-Level Error Handler

To handle errors only for a specific part of your application, register an `error` hook inside a module.

```typescript
import { type App, hook, abort } from "@minimajs/server";
import type { Context } from "@minimajs/server";

async function adminModule(app: App) {
  // This hook only applies to routes within adminModule
  app.register(
    hook("error", (error: unknown, ctx: Context) => {
      console.error("Admin module error:", error);

      const statusCode = abort.is(error) ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : "An unknown error occurred";

      // Abort with a structured admin-specific error
      abort({ adminError: message }, statusCode);
    })
  );

  app.get("/dashboard", () => {
    throw new Error("Failed to load admin dashboard.");
  });
}

// Registering the module
app.register(adminModule, { prefix: "/admin" });
```

### Request-Scoped Error Handler (`onError`)

For even more fine-grained control, the `onError` helper registers a handler that only executes for errors occurring during a **single request**.

```typescript
import { createApp, onError } from "@minimajs/server";

const app = createApp();

app.get("/danger", () => {
  onError((err) => {
    // This runs only if this specific request fails.
    console.error("Request-specific error:", err);
  });

  if (Math.random() > 0.5) {
    throw new Error("Something went wrong!");
  }

  return { status: "ok" };
});
```

## Custom Error Handler (`app.errorHandler`)

For complete control over error responses, you can replace the default error handler by setting `app.errorHandler`. This is a global fallback that runs when no `error` hooks handle the error.

```typescript
import { createApp, createResponseFromState } from "@minimajs/server";
import type { Context } from "@minimajs/server";

const app = createApp();

// Custom error handler
app.errorHandler = async (error: unknown, ctx: Context) => {
  // Log the error
  ctx.app.log.error(error);

  // Custom error response format
  const isDev = process.env.NODE_ENV === "development";
  const statusCode = error instanceof Error && "status" in error ? (error as any).status : 500;

  const errorBody = JSON.stringify({
    success: false,
    error: isDev ? (error instanceof Error ? error.message : String(error)) : "Internal Server Error",
    timestamp: new Date().toISOString(),
    ...(isDev && error instanceof Error && { stack: error.stack }),
  });

  // Use createResponseFromState to preserve context headers (CORS, etc.)
  return createResponseFromState(errorBody, {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
};
```

> **Important:** Use `createResponseFromState` instead of `new Response()` to preserve headers set by plugins (like CORS) and the response context. Direct `Response` objects bypass the framework's header merging logic.

### `errorSent` Hook

The `errorSent` hook executes **after an error response is sent**, making it ideal for post-processing tasks like logging or reporting to an external service. Its signature is also `(error: unknown, ctx: Context)`.

```typescript
import { hook } from "@minimajs/server";
import type { Context } from "@minimajs/server";

app.register(
  hook("errorSent", (error: unknown, ctx: Context) => {
    // Report the error to an external monitoring service
    reportErrorToService(error);
  })
);
```
