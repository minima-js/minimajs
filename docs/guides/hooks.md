---
title: Hooks
sidebar_position: 5
tags:
  - hooks
  - lifecycle
---

# Hooks

Hooks are a powerful feature in Minima.js that allow you to tap into the request-response lifecycle and the application lifecycle. They provide a way to execute custom code at specific points, enabling you to extend and customize the framework's behavior.

## defer

The `defer` hook allows scheduling tasks for execution after sending the response.

```ts
import { defer } from "@minimajs/server";
function saveUser() {
  // saving user
  // save some log
  // highlight-start
  defer(() => {
    console.log("deleting log");
    // delete log
    // this will executed after request context completed
  });
  // highlight-end
}
```

## hook

The `hook` function creates lifecycle hook plugins that execute at specific points in the application lifecycle.

**Available lifecycle events:**

- `ready` - Executes when the application is ready
- `close` - Executes when the application is closing
- `listen` - Executes when the server starts listening
- `send` - Executes before sending the response
- `register` - Executes when a plugin is registered

**Basic Usage:**

```ts
import { createApp, hook } from "@minimajs/server";

const app = createApp();

// Register a hook that runs when the app is ready
app.register(
  hook("ready", async () => {
    console.log("Application is ready!");
  })
);

// Register a hook that runs when the app is closing
app.register(
  hook("close", async () => {
    console.log("Application shutting down");
  })
);
```

**Composing Multiple Hooks:**

Use `plugin.compose` to register multiple hooks together:

```ts
import { createApp, hook, plugin } from "@minimajs/server";

const closeDB = hook("close", async () => {
  await connection.close();
});

const connectDB = hook("ready", async () => {
  await connection.connect();
});

// Compose and register both hooks together
app.register(plugin.compose(connectDB, closeDB));
```

For more information about composing plugins, see the [Plugin guide](/guides/plugin.md).

## hook.define

The `hook.define()` function is a convenient way to register multiple application lifecycle hooks at once. It takes an object where the keys are the names of the lifecycle events and the values are the corresponding callback functions.

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

## Managing Resources with hook.lifespan

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
