# Hooks

Minima.js provides a powerful hook system to extend the application and tap into the request-response lifecycle and the application lifecycle. There are different types of hooks for different purposes.

## Request Hooks

Request hooks are executed within the context of a specific request. You can use them to run code at specific points during request processing.

### `defer`

The `defer` hook registers a callback that is executed after a response has been sent to the client. This is useful for tasks that don't need to block the response, such as logging, analytics, or cleaning up resources used during the request.

```typescript
import { createApp, defer } from "@minimajs/server";

const app = createApp();

app.get("/", (req, res) => {
  defer(() => {
    console.log("This runs after the response has been sent.");
  });

  res.send({ hello: "world" });
});
```

### `onError`

The `onError` hook registers a callback to handle errors that occur during the processing of a request within the current context. You can use it to implement custom error logging or formatting for specific routes.

```typescript
import { createApp, onError } from "@minimajs/server";

const app = createApp();

app.get("/risky", (req, res) => {
  onError((error, req, res) => {
    console.error("An error occurred on /risky:", error);
    // The default error handler will still run after this.
    // To implement a custom error response, you would use a try-catch
    // or a more comprehensive error handling middleware.
  });

  if (Math.random() > 0.5) {
    throw new Error("Something went wrong!");
  }

  res.send({ result: "success" });
});
```

## Application Lifecycle Hooks

Application hooks allow you to tie into the lifecycle of the Minima.js application itself. They are useful for tasks like setting up database connections, starting or stopping services, and other setup/teardown operations.

These hooks are created using the `hook()` function, which returns a Fastify plugin that you can register with your application.

The `hook` function can be used to create hooks for the following lifecycle events:

- `ready`: Triggered when all plugins have been loaded and the server is ready to accept connections.
- `listen`: Triggered when the server starts listening for connections.
- `close`: Triggered when the server is closing.
- `register`: Triggered when a new plugin is registered.

It can also be used for request/reply hooks that apply to all routes:

- `send`: Triggered for every request just before the payload is sent to the client.

### `hook()`

The `hook()` function creates a plugin for a specific lifecycle event.

```typescript
import { createApp, hook } from "@minimajs/server";

const app = createApp();

// A hook that runs when the application is ready
const readyHook = hook("ready", async () => {
  console.log("Application is ready to go!");
});

// A hook that runs when the application is closing
const closeHook = hook("close", async () => {
  console.log("Application is shutting down.");
});

// Register the hooks
app.register(readyHook);
app.register(closeHook);
```

You can also use `plugin.compose` to register multiple hooks together.

```typescript
import { plugin } from "@minimajs/server";
//...
app.register(plugin.compose(readyHook, closeHook));
```

## Lifespan Management

For resources that need both setup and teardown, like database connections, Minima.js provides a convenient `hook.lifespan` utility.

### `hook.lifespan()`

This creates a pair of hooks: one for `onReady` to initialize your resource, and one for `onClose` to clean it up.

The function you pass to `hook.lifespan` is executed when the app is ready. It can return a "finalizer" function, which will be automatically executed when the app closes.

```typescript
import { createApp, hook } from "@minimajs/server";

const db = {
  async connect() {
    console.log("DB connected");
  },
  async disconnect() {
    console.log("DB disconnected");
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

You can also use `hook.lifespan` for setup logic that doesn't require cleanup by simply not returning a function.

```typescript
const startupBanner = hook.lifespan(() => {
  console.log("Application is ready!");
});

app.register(startupBanner);
```

## Defining Multiple Hooks

To register multiple application lifecycle hooks at once, you can use the `hook.define()` utility. This is a convenient way to group related lifecycle logic together in a single plugin.

### `hook.define()`

The `hook.define()` function takes an object where keys are the names of lifecycle events (e.g., `ready`, `close`) and values are the corresponding callback functions. It returns a single plugin that registers all the provided hooks.

```typescript
import { createApp, hook } from "@minimajs/server";

const app = createApp();

const startupAndShutdown = hook.define({
  ready: async () => {
    console.log("The application is ready and has started.");
  },
  close: async () => {
    console.log("The application is closing.");
  },
});

app.register(startupAndShutdown);
```
