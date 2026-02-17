---
title: Routing
sidebar_position: 1
tags:
  - app
  - routing
---

# Routing

Routing is the process of defining how your application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on).

In Minima.js, you can define routes using the `routes` export in a module file, or programmatically using the application instance. Each route has a handler function that is executed when the route is matched.

## Quick Reference

- [`export const routes`](#basic-routing) - Define routes declaratively using the `Routes` type
- [`app.get/post/put/delete()`](#programmatic-routing) - Define routes programmatically
- [`app.route()`](#programmatic-routing) - Define routes with advanced options
- [`params()`](#route-parameters) - Get route parameters
- [`searchParams()`](#query-parameters) - Get query string parameters
- [Route metadata](#route-metadata) - Attach metadata to routes

---

## Basic Routing

The recommended way to define routes is by exporting a `routes` object from a module file. The `Routes` type is a record that maps `"<METHOD> /path"` keys to handler functions.

```typescript
import type { Routes } from "@minimajs/server";

function getHome() {
  return "Hello, World!";
}

function createUser() {
  return { message: "User created" };
}

export const routes: Routes = {
  // GET /
  "GET /": getHome,

  // POST /users
  "POST /users": createUser,
};
```

The key format is `"METHOD /path"`, where `METHOD` is an uppercase HTTP method and `/path` is the route path.

### Programmatic Routing

You can also define routes programmatically using the `app.get()`, `app.post()`, `app.put()`, `app.delete()` methods on the application instance. This is useful for standalone app scripts or when you need dynamic route registration.

```typescript
import { createApp } from "@minimajs/server";

const app = createApp();

// GET /
app.get("/", () => "Hello, World!");

// POST /users
app.post("/users", () => ({ message: "User created" }));
```

You can also use the `app.route()` method to define routes with more advanced options:

```typescript
app.route({
  method: "GET",
  url: "/",
  handler: () => "Hello, World!",
});
```

### Available Methods

Minima.js supports all the standard HTTP methods.

**Routes key format:**

- `"GET /path"` - GET requests
- `"POST /path"` - POST requests
- `"PUT /path"` - PUT requests
- `"PATCH /path"` - PATCH requests
- `"DELETE /path"` - DELETE requests
- `"HEAD /path"` - HEAD requests
- `"OPTIONS /path"` - OPTIONS requests
- `"ALL /path"` - matches all methods

**Programmatic app methods:**

- `app.get(path, handler)`
- `app.post(path, handler)`
- `app.put(path, handler)`
- `app.patch(path, handler)`
- `app.delete(path, handler)`
- `app.head(path, handler)`
- `app.options(path, handler)`
- `app.all(path, handler)` (matches all methods)

## Route Parameters

Route parameters are named URL segments that are used to capture the values specified at their position in the URL. The captured values are populated in the `params` object, which can be accessed from the `@minimajs/server` package.

```typescript
import type { Routes } from "@minimajs/server";
import { params } from "@minimajs/server";

function getUser() {
  const { id } = params<{ id: string }>();
  return { id };
}

export const routes: Routes = {
  // GET /users/123
  "GET /users/:id": getUser,
};
```

You can define multiple parameters in a single route:

```typescript
import type { Routes } from "@minimajs/server";
import { params } from "@minimajs/server";

function getPost() {
  const { userId, postId } = params<{ userId: string; postId: string }>();
  return { userId, postId };
}

export const routes: Routes = {
  // GET /users/123/posts/456
  "GET /users/:userId/posts/:postId": getPost,
};
```

### Optional Parameters

You can make a route parameter optional by adding a question mark (`?`) to the end of its name.

```typescript
import type { Routes } from "@minimajs/server";
import { params } from "@minimajs/server";

function getUser() {
  const { id } = params<{ id?: string }>();
  return { id: id || "No ID provided" };
}

export const routes: Routes = {
  // GET /users/123 or /users
  "GET /users/:id?": getUser,
};
```

## Wildcards

Wildcards (`*`) can be used to match any character in a URL segment.

```typescript
import type { Routes } from "@minimajs/server";
import { params } from "@minimajs/server";

function getWildcard() {
  const wildcard = params.get("*");
  return { wildcard };
}

export const routes: Routes = {
  // Matches /posts/foo, /posts/bar, etc.
  "GET /posts/*": getWildcard,
};
```

## Regular Expressions

You can also use regular expressions to define routes. This is useful for more advanced matching scenarios.

```typescript
import type { Routes } from "@minimajs/server";
import { params } from "@minimajs/server";

function getFile() {
  const { file } = params<{ file: string }>();
  return { file }; // { file: '123' }
}

export const routes: Routes = {
  // Matches /files/123.png
  "GET /files/:file(^\\d+).png": getFile,
};
```

## Route Metadata

Minima.js allows you to attach custom metadata to your routes. This is a powerful feature for adding route-specific configuration, flags, or contextual information that can be accessed by handlers, hooks, or plugins. Metadata is passed as `[key, value]` tuples directly in the route definition, before the final handler function.

It's recommended to use `Symbol`s as keys for your metadata to avoid potential name collisions.

**Defining Metadata with the `routes` export:**

When using the `routes` object, you can attach metadata using the `handler()` function. This function takes any number of descriptors (metadata tuples or functions) and a final handler callback.

```typescript
import { handler, type Routes } from "@minimajs/server";

// Define custom symbols for metadata keys
const kAuthRequired = Symbol("AuthRequired");
const kPermissions = Symbol("Permissions");

function getAdmin() {
  return { message: "Welcome, admin!" };
}

function createData() {
  return { message: "Data created" };
}

// Wrap handlers with descriptors using the handler() helper
const adminHandler = handler([kAuthRequired, true], [kPermissions, ["admin", "moderator"]], getAdmin);

const dataHandler = handler([kAuthRequired, false], createData);

export const routes: Routes = {
  "GET /admin": adminHandler,
  "POST /api/data": dataHandler,
};
```

**Defining Metadata programmatically:**

Programmatic methods like `app.get()` and `app.post()` support variadic descriptors passed directly before the handler callback.

```typescript
import { createApp } from "@minimajs/server";
const app = createApp();

const kAuthRequired = Symbol("AuthRequired");
const kPermissions = Symbol("Permissions");

// Descriptors are passed between path and handler
app.get("/admin", [kAuthRequired, true], [kPermissions, ["admin", "moderator"]], () => {
  return { message: "Welcome, admin!" };
});

app.post("/api/data", [kAuthRequired, false], () => {
  return { message: "Data created" };
});
```

**Accessing Metadata in a Handler:**

You can access the metadata for the current route using the `context().route.metadata` object within any handler or any function called within the handler's scope.

```typescript
import { context } from "@minimajs/server";
// Assuming kAuthRequired and kPermissions are imported or defined
const kAuthRequired = Symbol("AuthRequired");
const kPermissions = Symbol("Permissions");

app.get("/admin-dashboard", [kAuthRequired, true], [kPermissions, ["admin"]], () => {
  const routeMetadata = context().route.metadata;
  const authRequired = routeMetadata.get(kAuthRequired); // true
  const requiredPermissions = routeMetadata.get(kPermissions); // ["admin"]

  console.log(`Auth Required: ${authRequired}`);
  console.log(`Required Permissions: ${requiredPermissions}`);

  return { authRequired, requiredPermissions };
});
```

**Accessing Metadata in a Hook:**

Metadata is especially useful in hooks for implementing cross-cutting concerns dynamically. For instance, an authentication hook can check if a route requires authentication based on its metadata.

```typescript
import { app } from "./your-app-instance"; // Your app instance
import { hook, context, abort } from "@minimajs/server";
const kAuthRequired = Symbol("AuthRequired"); // Must be the same Symbol instance

app.register(
  hook("request", () => {
    const routeMetadata = context().route.metadata;
    const authRequired = routeMetadata[kAuthRequired];

    if (authRequired) {
      // Perform actual authentication check
      const isAuthenticated = false; // Replace with your auth logic
      if (!isAuthenticated) {
        abort("Unauthorized", 401);
      }
    }
  })
);

app.get(
  "/protected",
  [kAuthRequired, true], // This route will be checked by the hook
  () => {
    return { message: "You accessed a protected route!" };
  }
);

app.get(
  "/public",
  [kAuthRequired, false], // This route will skip the auth check
  () => {
    return { message: "This route is public." };
  }
);
```

By leveraging route metadata, you can create highly configurable and modular applications, where route-specific behavior can be easily defined and managed without cluttering your main handler logic.

## Structuring Routes with Modules

As your application grows, it's a good practice to organize your routes into modules. Each module file can export a `routes` object typed as `Routes`, and the framework will automatically discover and register them.

```typescript
// modules/users/index.ts
import type { Routes } from "@minimajs/server";
import { params } from "@minimajs/server";

function listUsers() {
  return "List users";
}

function getUser() {
  const { id } = params<{ id: string }>();
  return { id };
}

function createUser() {
  return { message: "User created" };
}

export const routes: Routes = {
  "GET /": listUsers,
  "GET /:id": getUser,
  "POST /": createUser,
};
```

To learn more about how to structure your application with modules, please refer to the [Modules](/core-concepts/modules) guide.
