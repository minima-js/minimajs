---
title: Plugin
sidebar_position: 10
tags:
  - plugin
  - hooks
  - composition
---

# Plugin

Plugins are the building blocks of Minima.js applications. They allow you to extend functionality, add lifecycle hooks, and compose reusable components.

## What is a Plugin?

A plugin is a Fastify plugin function that can be registered with your application using `app.register()`. Minima.js provides utilities to create and compose plugins easily.

## plugin.compose

The `plugin.compose` function combines multiple plugins into a single plugin. This is useful for registering related plugins together.

**Basic Usage:**

```typescript
import { createApp, plugin } from "@minimajs/server";

const plugin1 = plugin.sync(function myPlugin1(app, opts, done) {
  // Plugin logic here
  done();
});

const plugin2 = plugin.sync(function myPlugin2(app, opts, done) {
  // Plugin logic here
  done();
});

const app = createApp();

// Register multiple plugins at once
app.register(plugin.compose(plugin1, plugin2));
```

## Composing Hooks

One of the most common use cases for `plugin.compose` is managing lifecycle hooks together:

```typescript
import { createApp, hook, plugin } from "@minimajs/server";

const closeDB = hook("close", async () => {
  await connection.close();
  console.log("Database connection closed");
});

const connectDB = hook("ready", async () => {
  await connection.connect();
  console.log("Database connected");
});

const app = createApp();

// Compose and register both hooks together
app.register(plugin.compose(connectDB, closeDB));

await app.listen({ port: 3000 });
// Logs: "Database connected"

await app.close();
// Logs: "Database connection closed"
```

## Complex Plugin Composition

You can compose any combination of plugins, including hooks, middleware, and custom plugins:

```typescript
import { createApp, hook, plugin, interceptor, middleware } from "@minimajs/server";

// Define hooks
const closeCache = hook("close", async () => {
  await cache.disconnect();
});

const closeDB = hook("close", async () => {
  await db.disconnect();
});

const initApp = hook("ready", async () => {
  await initializeApp();
});

// Define middleware
const logger = middleware(async () => {
  console.log("Request received");
});

// Compose everything together
const appSetup = plugin.compose(initApp, closeDB, closeCache, logger);

const app = createApp();
app.register(appSetup);
```

## Benefits of Plugin Composition

1. **Organization** - Group related plugins together
2. **Reusability** - Create composable plugin bundles that can be reused across projects
3. **Clarity** - Make dependencies between plugins explicit
4. **Simplicity** - Register multiple plugins with a single `app.register()` call

## Creating Custom Plugins

You can create custom plugins using `plugin.sync` or the async `plugin` function:

**Synchronous Plugin:**

```typescript
import { plugin } from "@minimajs/server";

const myPlugin = plugin.sync(function myCustomPlugin(app, opts, done) {
  // Add routes, hooks, or other functionality
  app.get("/health", () => ({ status: "ok" }));
  done();
});

app.register(myPlugin);
```

**Asynchronous Plugin:**

```typescript
import { plugin } from "@minimajs/server";

const myAsyncPlugin = plugin(async function myCustomPlugin(app, opts) {
  // Async operations
  await someAsyncSetup();

  app.get("/status", () => ({ ready: true }));
});

app.register(myAsyncPlugin);
```

## Best Practices

1. **Use composition for related plugins** - Group lifecycle hooks that belong together
2. **Keep plugins focused** - Each plugin should have a single responsibility
3. **Name your plugins** - Use descriptive function names for better debugging
4. **Document dependencies** - Make it clear which plugins depend on others

## See Also

- [Hooks](/guide/http#hooks) - Learn about lifecycle hooks
- [Middleware](/guide/middleware) - Learn about middleware and interceptors
- [Module](/guide/module) - Learn about creating modules
