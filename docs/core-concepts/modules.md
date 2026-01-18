---
title: Modules
sidebar_position: 4
tags:
  - module
  - encapsulation
  - scope
---

# Structuring Your Application with Modules

In Minima.js, a module is a self-contained unit of your application that encapsulates a specific feature or set of related functionalities. Think of modules as building blocks that you can use to construct your application in a clean, organized, and scalable way.

At its core, **a module is simply an asynchronous function** that receives an application instance. This function can then define routes, register hooks, or even register other modules, creating an encapsulated scope.

## Why Use Modules?

Using modules to structure your application has several benefits:

- **Organization:** Modules help you keep your code organized by grouping related functionalities together.
- **Encapsulation:** Each module creates an isolated scope. Hooks, plugins, and prefixes registered inside a module do not affect its parent or sibling modules.
- **Reusability:** Modules can be reused across different parts of your application or even in other projects.
- **Scalability:** By breaking your application into smaller, independent modules, you can scale it more easily.
- **Testability:** Modules are easier to test in isolation.

## Creating a Module

A module is a plain `async` function that receives the application instance.

Here's an example of a simple `user` module:

```typescript title="src/user/index.ts"
import { type App } from "@minimajs/server";

// A simple in-memory database for users
const users = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Doe" },
];

async function getUsers() {
  return users;
}

export async function userModule(app: App) {
  app.get("/users", getUsers);
}
```

## Registering a Module

To use a module, you register it with the application using the `app.register()` method.

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { userModule } from "./user";

const app = createApp();

app.register(userModule);

await app.listen({ port: 3000 });
```

Now, your application has a `/users` route that returns a list of users.

## Using Prefixes

You can group a module's routes under a common path by passing a `prefix` option to `app.register()`.

```typescript title="src/index.ts"
app.register(userModule, { prefix: "/api/v1" });
```

Now, the `/users` route will be available at `/api/v1/users`.

## Nested Modules

You can nest modules to create a hierarchical and organized structure for your application. The prefix of the parent module will be prepended to the prefixes of any nested modules.

```typescript title="src/user/post/index.ts"
import { type App } from "@minimajs/server";

export async function postModule(app: App) {
  app.get("/", () => "All posts for a user");
}
```

```typescript title="src/user/index.ts"
import { type App } from "@minimajs/server";
import { postModule } from "./post";

export async function userModule(app: App) {
  app.get("/:id", () => "A single user");

  // Register the nested module
  app.register(postModule, { prefix: "/:id/posts" });
}
```

When `userModule` is registered with a prefix like `/users`, the routes will be:

- `GET /users/:id`
- `GET /users/:id/posts`

This powerful pattern of encapsulation and composition is central to building well-structured, maintainable, and scalable applications with Minima.js.
