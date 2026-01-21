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

**In Minima.js, everything is a plugin** - even hooks are plugins. Apply them via:
- **`meta.plugins`** in module files (recommended)
- **`app.register()`** for manual registration

This guide covers how to create plugins and how to use them in your modules.

> **Important:** The `meta.plugins` property **only works in module files** (files named `module.ts` by default, or whatever you configure with `moduleDiscovery.index`). It will **not** work in random files - only in files that are auto-discovered as modules. For other files or manual registration, use `app.register()` instead.

## What is a Plugin?

A plugin is a reusable component that extends the functionality of your application. Unlike modules, which create isolated scopes, plugins operate within the current scope they are registered in.

### Plugin vs. Module

Understanding the distinction between a plugin and a module is key to structuring your application effectively.

**Module** (creates a new isolated scope):
A module is a plain `async function` that creates a new, encapsulated scope. Hooks and plugins registered via `meta.plugins` do not affect parent or sibling scopes. This is ideal for grouping a feature's routes.

::: code-group

```typescript [src/users/module.ts]
// This is a MODULE - it creates a new nested scope
export default async function(app) {
  // This creates a child scope, isolated from siblings
  app.get("/list", () => getUsers());
}
```

:::

**Plugin** (extends the current scope):
A plugin is a function wrapped with the `plugin()` utility. It extends the _current_ scope via `meta.plugins`, making it perfect for adding hooks that should apply to routes in that module.

::: code-group

```typescript [src/api/module.ts]
import { plugin, hook } from "@minimajs/server";

// Create a custom plugin
const authPlugin = plugin(async function auth(app) {
  app.register(hook("request", authMiddleware));
});

// Register plugin in meta - extends current module scope
export const meta = {
  plugins: [authPlugin]
};

export default async function(app) {
  app.get("/protected", () => "authenticated");
}
```

:::

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

::: code-group

```typescript [plugins/api-key.ts]
import { plugin, hook } from "@minimajs/server";

interface ApiPluginOptions {
  apiKey: string;
  timeout?: number;
}

export const apiPlugin = (options: ApiPluginOptions) =>
  plugin(async function api(app) {
    const { apiKey, timeout = 5000 } = options;

    app.register(
      hook("request", async () => {
        // Example: check api key on all requests in this scope
      })
    );
  });
```

```typescript [src/api/module.ts]
import { apiPlugin } from "../../plugins/api-key.js";

// Register plugin with options in meta
export const meta = {
  plugins: [
    apiPlugin({
      apiKey: process.env.API_KEY!,
      timeout: 10000,
    })
  ]
};

export default async function(app) {
  app.get("/data", () => "protected data");
}
```

:::

### `plugin.sync()`

Creates a synchronous plugin. For simple plugins that don't perform async operations, this is a convenient option.

```typescript
plugin.sync<T>(fn: PluginCallbackSync<T>): Plugin
```

**Example:**

::: code-group

```typescript [plugins/cors.ts]
import { plugin, hook } from "@minimajs/server";

export const corsPlugin = plugin.sync(function cors(app) {
  app.register(
    hook("request", (ctx) => {
      ctx.responseState.headers.set("Access-Control-Allow-Origin", "*");
    })
  );
});
```

```typescript [src/api/module.ts]
import { corsPlugin } from "../../plugins/cors.js";

export const meta = {
  plugins: [corsPlugin]
};

export default async function(app) {
  app.get("/data", () => ({ data: "value" }));
}
```

:::

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

::: code-group

```typescript [src/module.ts]
import { compose, hook } from "@minimajs/server";

// Compose lifecycle hooks for database management
const dbLifecycle = compose(
  hook("ready", async () => await db.connect()),
  hook("close", async () => await db.close())
);

export const meta = {
  plugins: [dbLifecycle]
};

export default async function(app) {
  app.get("/health", () => "ok");
}
```

:::

### `compose.create()`

`compose.create()` creates a reusable "applicator" that wraps plugins together. Useful for creating shared plugin stacks.

**Signature:**

```typescript
function create<T extends PluginOptions = any>(
  ...plugins: (Plugin<T> | PluginSync)[]
): (module: Plugin<T> | PluginSync) => Plugin<T>;
```

**Usage:**

::: code-group

```typescript [src/api/module.ts]
import { compose } from "@minimajs/server";
import { authPlugin } from "../../plugins/auth.js";
import { loggingPlugin } from "../../plugins/logging.js";

// Create a composer with common plugins
const withAuthAndLogging = compose.create(authPlugin, loggingPlugin);

export const meta = {
  plugins: [
    withAuthAndLogging(/* additional plugin here */)
  ]
};

export default async function(app) {
  app.get("/data", () => "protected data");
}
```

:::

**Execution Order:** `authPlugin` → `loggingPlugin` → additional plugins.

## Use Cases for Composition

#### 1. Reusable Plugin Stacks

::: code-group

```typescript [src/api/module.ts]
import { compose } from "@minimajs/server";
import { corsPlugin } from "../../plugins/cors.js";
import { helmetPlugin } from "../../plugins/helmet.js";
import { rateLimitPlugin } from "../../plugins/rate-limit.js";
import { authPlugin } from "../../plugins/auth.js";

// Compose security plugins
const securityPlugins = compose(
  corsPlugin({ origin: "https://example.com" }),
  helmetPlugin(),
  rateLimitPlugin({ max: 100 }),
  authPlugin({ secretKey: process.env.JWT_SECRET! })
);

export const meta = {
  plugins: [securityPlugins]
};

export default async function(app) {
  app.get("/secure", () => "protected");
}
```

:::

#### 2. Combining Multiple Hooks

::: code-group

```typescript [src/module.ts]
import { compose, hook } from "@minimajs/server";

// Group related lifecycle hooks
const appLifecycle = compose(
  hook("ready", async () => {
    await db.connect();
    await cache.warmup();
  }),
  hook("close", async () => {
    await cache.flush();
    await db.disconnect();
  })
);

export const meta = {
  plugins: [appLifecycle]
};

export default async function(app) {
  app.get("/health", () => "ok");
}
```

:::

## Best Practices

1.  **Use `meta.plugins`** in module files instead of `app.register()` for better organization
2.  **Keep Plugins Focused**: Each plugin should have a single, clear responsibility
3.  **Use Composition for Reusability**: Group related hooks and setup logic with `compose()`
4.  **Order Matters in Composition**: Plugins execute in the order they're defined in the array
5.  **Use TypeScript for Options**: Define interfaces for plugin options to ensure type safety
6.  **Create Reusable Plugins**: Store plugins in a `plugins/` directory for reuse across modules

## See Also

- [Hooks](/guides/hooks)
- [Modules](/core-concepts/modules)

---

## Practical Examples

### Authentication Plugin

::: code-group

```typescript [plugins/auth.ts]
import { plugin, hook, abort } from "@minimajs/server";

interface AuthOptions {
  secretKey: string;
  excludePaths?: string[];
}

export const authPlugin = (options: AuthOptions) =>
  plugin(async function auth(app) {
    const { secretKey, excludePaths = [] } = options;

    app.register(
      hook("request", async (ctx) => {
        if (excludePaths.includes(ctx.pathname)) return;

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
```

```typescript [src/api/module.ts]
import { authPlugin } from "../../plugins/auth.js";

export const meta = {
  plugins: [
    authPlugin({
      secretKey: process.env.JWT_SECRET!,
      excludePaths: ["/login", "/register"],
    })
  ]
};

export default async function(app) {
  app.get("/protected", () => ({ data: "secret" }));
}
```

:::

### Logging Plugin

::: code-group

```typescript [plugins/logger.ts]
import { plugin, hook } from "@minimajs/server";

export const requestLogger = plugin(async function logger(app) {
  app.register(
    hook("request", (ctx) => {
      console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${ctx.request.url}`);
    })
  );

  app.register(
    hook("send", (response, ctx) => {
      console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${ctx.request.url} - ${response.status}`);
    })
  );
});
```

```typescript [src/module.ts]
import { requestLogger } from "../plugins/logger.js";

// Register logger in root module - applies to all child modules
export const meta = {
  plugins: [requestLogger]
};

export default async function(app) {
  app.get("/health", () => "ok");
}
```

:::

### Database Connection Plugin

::: code-group

```typescript [plugins/database.ts]
import { plugin, hook } from "@minimajs/server";

interface DbOptions {
  connectionString: string;
  poolSize?: number;
}

export const dbPlugin = (options: DbOptions) =>
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
```

```typescript [src/module.ts]
import { dbPlugin } from "../plugins/database.js";

// Register database plugin in root module
export const meta = {
  plugins: [
    dbPlugin({
      connectionString: process.env.DATABASE_URL!,
    })
  ]
};

export default async function(app) {
  app.get("/health", () => "ok");
}
```

:::

---

## Manual Registration (Alternative)

If you're not using module discovery (`moduleDiscovery: false`) or need to register plugins manually in your entry file, you can use `app.register()`:

```typescript
import { createApp } from "@minimajs/server/bun";
import { authPlugin } from "./plugins/auth.js";
import { requestLogger } from "./plugins/logger.js";

const app = createApp({ moduleDiscovery: false });

// Register plugins manually
app.register(requestLogger);
app.register(authPlugin({
  secretKey: process.env.JWT_SECRET!,
  excludePaths: ["/login"],
}));

// Register modules manually
app.register(async (app) => {
  app.get("/users", () => "users");
}, { prefix: "/api" });

await app.listen({ port: 3000 });
```

**When to use manual registration:**
- Apps without module discovery
- Registering global plugins in entry files
- Building reusable plugin libraries
- Quick prototypes or single-file apps

**Recommended:** Use `meta.plugins` in module files for better organization and automatic discovery.
