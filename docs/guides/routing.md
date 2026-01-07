---
title: Routing
sidebar_position: 1
tags:
  - app
  - routing
---

# Routing

Routing is the process of defining how your application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on).

In Minima.js, you can define routes using the application instance. Each route has a handler function that is executed when the route is matched.

## Basic Routing

The most basic way to define a route is to use the `app.get()`, `app.post()`, `app.put()`, `app.delete()` methods, which correspond to the respective HTTP methods.

```typescript
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

Minima.js supports all the standard HTTP methods:

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
import { params } from "@minimajs/server";

// GET /users/123
app.get("/users/:id", () => {
  const { id } = params<{ id: string }>();
  return { id };
});
```

You can define multiple parameters in a single route:

```typescript
// GET /users/123/posts/456
app.get("/users/:userId/posts/:postId", () => {
  const { userId, postId } = params<{ userId: string; postId: string }>();
  return { userId, postId };
});
```

### Optional Parameters

You can make a route parameter optional by adding a question mark (`?`) to the end of its name.

```typescript
// GET /users/123 or /users
app.get("/users/:id?", () => {
  const { id } = params<{ id?: string }>();
  return { id: id || "No ID provided" };
});
```

## Wildcards

Wildcards (`*`) can be used to match any character in a URL segment.

```typescript
// Matches /posts/foo, /posts/bar, etc.
app.get("/posts/*", () => {
  const wildcard = params.get("*");
  return { wildcard };
});
```

## Regular Expressions

You can also use regular expressions to define routes. This is useful for more advanced matching scenarios.

```typescript
// Matches /files/123.png
app.get("/files/:file(^\\d+).png", () => {
  const { file } = params<{ file: string }>();
  return { file }; // { file: '123' }
});
```

## Route Options

When defining a route, you can also pass an `options` object to customize its behavior.

```typescript
app.post("/users", { bodyLimit: 1024 * 1024 * 10 }, () => {
  // ...
});
```

The following options are available:

- `bodyLimit`: The maximum size of the request body in bytes.

## Route Metadata

Minima.js allows you to attach custom metadata to your routes. This is a powerful feature for adding route-specific configuration, flags, or contextual information that can be accessed by handlers, hooks, or plugins. Metadata is passed as `[key, value]` tuples directly in the route definition, before the final handler function.

It's recommended to use `Symbol`s as keys for your metadata to avoid potential name collisions.

**Defining Metadata:**

```typescript
import { app } from "./your-app-instance"; // Your app instance
// Define custom symbols for metadata keys
const kAuthRequired = Symbol("AuthRequired");
const kPermissions = Symbol("Permissions");

app.get(
  "/admin",
  [kAuthRequired, true], // Metadata tuple 1
  [kPermissions, ["admin", "moderator"]], // Metadata tuple 2
  () => {
    return { message: "Welcome, admin!" };
  }
);

app.post(
  "/api/data",
  [kAuthRequired, false], // This route doesn't require auth
  () => {
    return { message: "Data created" };
  }
);
```

**Accessing Metadata in a Handler:**

You can access the metadata for the current route using the `context().route.metadata` object within any handler or any function called within the handler's scope.

```typescript
import { context } from "@minimajs/server";
// Assuming kAuthRequired and kPermissions are imported or defined
const kAuthRequired = Symbol("AuthRequired");
const kPermissions = Symbol("Permissions");

app.get(
  "/admin-dashboard",
  [kAuthRequired, true],
  [kPermissions, ["admin"]],
  () => {
    const routeMetadata = context().route.metadata;
    const authRequired = routeMetadata.get(kAuthRequired); // true
    const requiredPermissions = routeMetadata.get(kPermissions); // ["admin"]

    console.log(`Auth Required: ${authRequired}`);
    console.log(`Required Permissions: ${requiredPermissions}`);

    return { authRequired, requiredPermissions };
  }
);
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
    const authRequired = routeMetadata.get(kAuthRequired);

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

As your application grows, it's a good practice to organize your routes into modules. This helps you keep your code organized and maintainable.

To learn more about how to structure your application with modules, please refer to the [Modules](/core-concepts/modules) guide.
