---
title: Hooks
sidebar_position: 5
tags:
  - hooks
  - lifecycle
---

# Hooks

Hooks are a powerful feature in Minima.js that allow you to tap into the request-response lifecycle and the application lifecycle. They provide a way to execute custom code at specific points, enabling you to extend and customize the framework's behavior.

## Request/Response Hooks

Request/response hooks are executed within the context of a specific request. They allow you to run code at different stages of the request processing pipeline.

### `defer`

The `defer` hook registers a callback that is executed **after** the response has been sent to the client. This is useful for tasks that don't need to block the response, such as:

- Sending analytics events
- Logging request-specific information
- Cleaning up resources used during the request

```typescript
import { createApp, defer } from "@minimajs/server";

const app = createApp();

app.get("/", (req, res) => {
  // Some processing...

  defer(() => {
    // This code will run after the response is sent
    console.log("Response has been sent for /");
  });

  res.send({ message: "Hello, World!" });
});
```

### `onError`

The `onError` hook registers a callback to handle errors that occur during the processing of a request. This is useful for implementing custom error logging or formatting for specific routes.

```typescript
import { createApp, onError } from "@minimajs/server";

const app = createApp();

app.get("/risky-operation", (req, res) => {
  onError((error) => {
    // This code will run if an error is thrown in this route
    console.error("An error occurred in /risky-operation:", error);
  });

  if (Math.random() > 0.5) {
    throw new Error("Something went wrong!");
  }

  res.send({ status: "success" });
});
```

## Application Lifecycle Hooks

Application lifecycle hooks allow you to tie into the lifecycle of the Minima.js application itself. They are useful for tasks like:

- Setting up and tearing down database connections
- Starting and stopping background services
- Loading configuration

### `hook.define()`

The `hook.define()` function is the most common way to register multiple application lifecycle hooks at once. It takes an object where the keys are the names of the lifecycle events and the values are the corresponding callback functions.

```typescript
import { createApp, hook } from "@minimajs/server";

const app = createApp();

const appLifecycle = hook.define({
  // 'ready' is triggered when the server is ready to accept connections
  ready: async () => {
    console.log("Application is ready!");
  },
  // 'close' is triggered when the server is closing
  close: async () => {
    console.log("Application is shutting down.");
  },
});

app.register(appLifecycle);
```

### Managing Resources with `hook.lifespan`

For resources that need to be initialized when the application starts and cleaned up when it stops (like database connections), Minima.js provides a convenient `hook.lifespan` utility.

The function you pass to `hook.lifespan` is executed when the application is ready. It can return a "finalizer" function, which will be automatically executed when the application closes.

```typescript
import { createApp, hook } from "@minimajs/server";

const db = {
  async connect() {
    console.log("Database connected");
  },
  async disconnect() {
    console.log("Database disconnected");
  },
};

const app = createApp();

const dbLifespan = hook.lifespan(async () => {
  await db.connect();

  // Return the cleanup function
  return async () => {
    await db.disconnect();
  };
});

app.register(dbLifespan);
```

This is a clean and declarative way to manage the lifecycle of your application's resources.
