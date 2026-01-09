---
title: Plugins & Composition
sidebar_position: 10
tags:
  - plugin
  - module
  - compose
  - hooks
  - composition
---

# Plugins & Composition

Plugins are the fundamental building blocks of Minima.js applications. They allow you to encapsulate and reuse logic, extend functionality, add lifecycle hooks, and compose complex features from smaller, manageable pieces.

This guide covers how to create plugins and how to compose them into powerful, reusable structures.

## What is a Plugin?

A plugin is a reusable component that extends the functionality of your application. Unlike modules, which create isolated scopes, plugins operate within the current scope they are registered in.

### Plugin vs. Module

Understanding the distinction between a plugin and a module is key to structuring your application effectively.

**Module** (creates a new isolated scope):
A module is a plain `async function` that creates a new, encapsulated scope. Hooks and routes registered inside a module do not affect its parent or sibling scopes. This is ideal for grouping a feature's routes.

```typescript
// This is a MODULE - it creates a new nested scope
app.register(async function userModule(app, opts) {
  // This creates a child scope, isolated from siblings.
  app.get("/users", () => getUsers());
});
```

**Plugin** (extends the current scope):
A plugin is a function wrapped with the `plugin()` utility. It extends the _current_ scope, making it perfect for adding hooks, middleware, or decorators that should apply to other routes or plugins at the same level.

```typescript
import { plugin, hook } from "@minimajs/server";

// This is a PLUGIN - it extends the current scope
app.register(
  plugin(async function authPlugin(app, opts) {
    // This hook is added to the CURRENT scope.
    app.register(hook("request", authMiddleware));
  })
);
```

| Feature       | Plugin (`plugin()`)          | Module (`async function`)      |
| ------------- | ---------------------------- | ------------------------------ |
| **Scope**     | Extends **current** scope    | Creates **new isolated** scope |
| **Use Case**  | Hooks, middleware, utilities | Feature routes, route groups   |
| **Isolation** | No (shares context)          | Yes (child context)            |

> For a deeper dive into modules, see the [Modules guide](/core-concepts/modules).

## Creating Plugins

Minima.js provides two functions for creating plugins: `plugin` for asynchronous logic and `plugin.sync` for synchronous logic.

### `plugin()`

Creates an asynchronous plugin. This is useful for plugins that need to perform async operations during setup.

```typescript
plugin<T>(fn: PluginCallback<T>): Plugin
```

**Example (with options factory):**

```typescript
import { plugin, hook } from "@minimajs/server";

interface ApiPluginOptions {
  apiKey: string;
  timeout?: number;
}

const apiPlugin = (options: ApiPluginOptions) =>
  plugin(async function api(app) {
    const { apiKey, timeout = 5000 } = options;

    app.register(
      hook("request", async () => {
        // Example: check api key on all requests in this scope
      })
    );
  });

// Register with options
app.register(
  apiPlugin({
    apiKey: process.env.API_KEY!,
    timeout: 10000,
  })
);
```

### `plugin.sync()`

Creates a synchronous plugin. For simple plugins that don't perform async operations, this is a convenient option.

```typescript
plugin.sync<T>(fn: PluginCallbackSync<T>): Plugin
```

**Example:**

```typescript
import { plugin, hook } from "@minimajs/server";

const corsPlugin = plugin.sync(function cors(app, opts) {
  app.register(
    hook("request", (ctx) => {
      ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    })
  );
});

app.register(corsPlugin);
```

---

## Composing Plugins and Modules

Composition is a core pattern in Minima.js. The `compose` API provides powerful utilities for combining multiple plugins and modules into a single, reusable unit.

### `compose()`

`compose()` combines multiple plugins or modules into a single plugin that registers them sequentially.

**Signature:**

```typescript
function compose<T extends PluginOptions = any>(...plugins: (Plugin<T> | PluginSync)[]): Plugin<T>;
```

**Usage:**

```typescript
import { compose, hook, type App } from "@minimajs/server";

// 1. Compose lifecycle hooks for database management
const dbLifecycle = compose(
  hook("ready", async () => await db.connect()),
  hook("close", async () => await db.close())
);
app.register(dbLifecycle);

// 2. Compose multiple feature modules into a single API
async function authModule(app: App) {
  /* ... */
}
async function usersModule(app: App) {
  /* ... */
}

const apiModule = compose(authModule, usersModule);
app.register(apiModule); // register composed module
```

### `compose.create()`

`compose.create()` creates a reusable "applicator" that wraps a module with a common set of plugins, such as middleware.

**Signature:**

```typescript
function create<T extends PluginOptions = any>(
  ...plugins: (Plugin<T> | PluginSync)[]
): (module: Plugin<T> | PluginSync) => Plugin<T>;
```

**Usage:**

```typescript
import { compose, type App } from "@minimajs/server";

// Create a composer with common middleware
const withAuthAndLogging = compose.create(authPlugin, loggingPlugin);

// Define modules
async function usersModule(app: App) {
  /* ... */
}
async function postsModule(app: App) {
  /* ... */
}

// Apply the composer to both modules
app.register(withAuthAndLogging(usersModule));
app.register(withAuthAndLogging(postsModule));
```

**Execution Order:** `authPlugin` → `loggingPlugin` → `usersModule`.

## Use Cases for Composition

#### 1. Reusable Middleware Stacks

```typescript
const withSecureMiddleware = compose.create(
  corsPlugin({ origin: "https://example.com" }),
  helmetPlugin(),
  rateLimitPlugin({ max: 100 }),
  authenticationPlugin()
);

// Apply to all API routes
app.register(withSecureMiddleware(publicApiModule));
app.register(withSecureMiddleware(privateApiModule));
```

#### 2. Grouping Feature Modules

```typescript
const userFeatures = compose(userAuthModule, userProfileModule, userSettingsModule);
const adminFeatures = compose(adminDashboardModule, adminUsersModule);

app.register(userFeatures);
app.register(adminFeatures);
```

## Best Practices

1.  **Keep Plugins Focused**: Each plugin should have a single, clear responsibility.
2.  **Use Composition for Reusability**: Group related hooks and setup logic.
3.  **Order Matters in Composition**: Place middleware in a logical sequence.
4.  **Use TypeScript for Options**: Define interfaces for plugin options to ensure type safety.

## See Also

- [Hooks](/guides/hooks)
- [Middleware](/guides/middleware)
- [Modules](/core-concepts/modules)

---

## Practical Examples

### Authentication Plugin

```typescript
import { plugin, hook, abort } from "@minimajs/server";

interface AuthOptions {
  secretKey: string;
  excludePaths?: string[];
}

const authPlugin = (options: AuthOptions) =>
  plugin(async function auth(app) {
    const { secretKey, excludePaths = [] } = options;

    app.register(
      hook("request", async (ctx) => {
        if (excludePaths.includes(ctx.request.url.pathname)) return;

        const token = ctx.request.headers.get("authorization")?.split(" ")[1];
        if (!token) {
          abort({ error: "Unauthorized" }, 401);
        }

        try {
          const user = await verifyToken(token, secretKey);
          // You would typically use `createContext` to make the user available.
          // e.g., `setUser(user)`
        } catch (err) {
          abort({ error: "Invalid token" }, 401);
        }
      })
    );
  });

app.register(
  authPlugin({
    secretKey: process.env.JWT_SECRET!,
    excludePaths: ["/login", "/register"],
  })
);
```

### Logging Plugin

```typescript
import { plugin, hook } from "@minimajs/server";

const requestLogger = plugin(async function logger(app) {
  app.register(
    hook("request", (ctx) => {
      console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${ctx.request.url}`);
    })
  );

  app.register(
    hook("send", (ctx) => {
      console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${ctx.request.url} - ${ctx.response.status}`);
    })
  );
});

app.register(requestLogger);
```

### Database Connection Plugin

```typescript
import { plugin, hook } from "@minimajs/server";

interface DbOptions {
  connectionString: string;
  poolSize?: number;
}

const dbPlugin = (options: DbOptions) =>
  plugin(async function database(app) {
    const { connectionString, poolSize = 10 } = options;

    app.register(
      hook("ready", async () => {
        await db.connect(connectionString, { poolSize });
        console.log("Database connected");
      })
    );

    app.register(
      hook("close", async () => {
        await db.disconnect();
        console.log("Database disconnected");
      })
    );

    // Add health check route
    app.get("/health/db", async () => {
      const isHealthy = await db.ping();
      return { status: isHealthy ? "healthy" : "unhealthy" };
    });
  });

app.register(
  dbPlugin({
    connectionString: process.env.DATABASE_URL!,
  })
);
```
