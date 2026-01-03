---
title: Modules
sidebar_position: 3
tags:
  - module
  - context
  - interceptor
---

# Structuring Your Application with Modules

In Minima.js, a module is a self-contained unit of your application that encapsulates a specific feature or set of related functionalities. Think of modules as building blocks that you can use to construct your application in a clean, organized, and scalable way.

At its core, **a module is simply an asynchronous function** that receives the application instance as its first argument. This function can then use the application instance to define routes, register plugins, and configure other aspects of the application.

## Why Use Modules?

Using modules to structure your application has several benefits:

- **Organization:** Modules help you keep your code organized by grouping related functionalities together. This makes it easier to find and maintain your code as your application grows.
- **Reusability:** Modules can be reused across different parts of your application or even in other applications.
- **Scalability:** By breaking your application into smaller, independent modules, you can scale it more easily. You can work on different modules in parallel and add new features without affecting the rest of the application.
- **Testability:** Modules are easier to test in isolation, which helps you write more reliable code.

## Creating a Module

To create a module, you simply need to create a new file and export an asynchronous function. This function will receive the application instance as its first argument.

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

In this example, we've created a `userModule` that defines a single route for fetching all users.

## Registering a Module

To use a module, you need to register it with your application using the `app.register()` method.

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { userModule } from "./user";

const app = createApp();

app.register(userModule);

await app.listen({ port: 3000 });
```

Now, your application will have a `/users` route that returns a list of users.

## Using Prefixes

As your application grows, you might want to group your routes under a common prefix. You can do this by passing a `prefix` option to the `app.register()` method.

```typescript title="src/index.ts"
app.register(userModule, { prefix: "/api/v1" });
```

Now, the `/users` route will be available at `/api/v1/users`.

## Nested Modules

You can also nest modules to create a hierarchical structure for your application. For example, you could have a `post` module within the `user` module.

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
  app.register(postModule, { prefix: "/:id/posts" });
}
```

By using modules effectively, you can build well-structured, maintainable, and scalable applications with Minima.js.
