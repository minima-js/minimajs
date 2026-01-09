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

Proper error handling is crucial for building robust and reliable web applications. Minima.js provides a flexible and powerful error handling mechanism centered around hooks and helpers.

By default, uncaught exceptions result in a generic `500 Internal Server Error` response.

## Quick Reference

- [`abort`](#the-abort-helper) - Throw HTTP errors with status codes
- [`redirect`](#the-redirect-helper) - Redirect users to different URLs
- [`error` hook](#error-hook-behavior) - Handle errors at different scopes
- [`app.errorHandler`](#custom-error-handler-apperrorhandler) - Global error fallback
- [`errorSent` hook](#errorsent-hook) - Post-error cleanup
- [`onError`](#request-scoped-error-handler-onerror) - Request-specific error handling

---

## Throwing Errors

### The `abort` Helper

The `abort` helper throws HTTP-specific errors with status codes and custom payloads.

```typescript
import { abort } from "@minimajs/server";

app.get("/users/:id", () => {
  const user = findUserById(params.get("id"));

  if (!user) {
    abort({ error: "User not found" }, 404);
  }

  return user;
});
```

**Common shortcuts:**

```typescript
abort.notFound("User not found"); // 404
abort.badRequest("Invalid input"); // 400
abort.unauthorized("Login required"); // 401
abort.forbidden("Access denied"); // 403
```

**Check if error is from abort:**

```typescript
if (abort.is(error)) {
  console.log(error.statusCode); // Access status code
}
```

### The `redirect` Helper

Redirect users to different URLs with `redirect`.

```typescript
import { redirect } from "@minimajs/server";

app.get("/old-path", () => {
  redirect("/new-path"); // 302 temporary redirect
});

app.get("/moved", () => {
  redirect("/permanent", true); // 301 permanent redirect
});
```

## Error Handling Flow

<!--@include: ./diagrams/error-handler-flow.md-->

## Handling Errors with Hooks

### `error` Hook Behavior

The `error` hook intercepts errors and can handle them in four ways:

<!--@include: ./diagrams/error-hook-outcomes.md-->

**Four possible outcomes:**

1. **Re-throw or abort** (Recommended) - Pass to next error hook or handler
2. **Return data** - Treated as successful `200 OK` response
3. **Return Response** - Sent directly (⚠️ bypasses plugins/CORS)
4. **Return undefined** - Pass to next error hook

### Global Error Handler

Handle errors across your entire application:

```typescript
import { hook, abort } from "@minimajs/server";

app.register(
  hook("error", (error) => {
    console.error("Error occurred:", error);

    if (abort.is(error) && error.statusCode === 404) {
      abort({ code: "NOT_FOUND", message: "Resource not found" }, 404);
    }

    abort({ code: "INTERNAL_ERROR", message: "Server error" }, 500);
  })
);
```

### Module-Level Error Handler

Handle errors for specific modules with scoped error hooks:

<!--@include: ./diagrams/error-scope-hierarchy.md-->

```typescript
async function adminModule(app: App) {
  app.register(
    hook("error", (error) => {
      console.error("Admin error:", error);
      const statusCode = abort.is(error) ? error.statusCode : 500;
      abort({ adminError: error.message }, statusCode);
    })
  );

  app.get("/dashboard", () => {
    throw new Error("Dashboard failed");
  });
}

app.register(adminModule, { prefix: "/admin" });
```

> **Note:** Error hooks execute in LIFO order, with child scopes running before parent scopes. See the diagram above for the hierarchy.

### Request-Scoped Error Handler (`onError`)

Handle errors for a single request with the `onError` helper:

```typescript
import { onError } from "@minimajs/server";

app.get("/risky", () => {
  onError((err) => {
    console.error("Request failed:", err);
  });

  if (Math.random() > 0.5) {
    throw new Error("Random failure!");
  }

  return { success: true };
});
```

## Custom Error Handler (`app.errorHandler`)

The `app.errorHandler` is the global fallback when no error hooks handle the error.

```typescript
import { createApp, createResponseFromState } from "@minimajs/server";

const app = createApp();

app.errorHandler = async (error, ctx) => {
  ctx.app.log.error(error);

  const isDev = process.env.NODE_ENV === "development";
  const statusCode = error instanceof Error && "status" in error ? (error as any).status : 500;

  const errorBody = JSON.stringify({
    success: false,
    error: isDev ? (error instanceof Error ? error.message : String(error)) : "Internal Server Error",
    timestamp: new Date().toISOString(),
    ...(isDev && error instanceof Error && { stack: error.stack }),
  });

  // Use createResponseFromState to preserve plugin headers (CORS, etc.)
  return createResponseFromState(errorBody, {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
};
```

> **Important:** Always use `createResponseFromState` instead of `new Response()` to preserve headers set by plugins.

## `errorSent` Hook

Execute cleanup tasks after an error response is sent:

```typescript
app.register(
  hook("errorSent", (error, ctx) => {
    // Report to monitoring service
    reportToSentry(error, {
      url: ctx.request.url,
      method: ctx.request.method,
    });
  })
);
```

## Best Practices

- **Use `abort` shortcuts** for common HTTP errors (`abort.notFound()`, `abort.badRequest()`, etc.)
- **Re-throw errors in hooks** to allow other handlers to process them
- **Avoid returning `Response`** from error hooks unless absolutely necessary
- **Use `createResponseFromState`** in `app.errorHandler` to preserve plugin headers
- **Log errors** before handling them for debugging and monitoring
- **Use scoped error hooks** for module-specific error handling
- **Keep error messages generic in production** to avoid leaking sensitive information
