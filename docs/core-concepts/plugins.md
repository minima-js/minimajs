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

## What is a Plugin?

A plugin is a reusable component that extends the functionality of your application. Plugins can add hooks, middleware, authentication, logging, or any cross-cutting concern.

**Key characteristics:**

- Created with `plugin()` or `plugin.sync()`
- Registered via `meta.plugins` in modules (recommended)
- Can be registered via `app.register()` (manual)
- Execute in the order they're defined

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
    }),
  ],
};

export default async function (app) {
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
  plugins: [corsPlugin],
};

export default async function (app) {
  app.get("/data", () => ({ data: "value" }));
}
```

:::

## Composing Plugins

The `compose()` function combines multiple plugins into a single plugin, executing them sequentially.

**Common use cases:**

- Group related hooks (lifecycle, logging)
- Create reusable plugin stacks (security, auth + logging)
- Organize complex plugin configurations

### Basic Usage

::: code-group

```typescript [src/api/module.ts]
import { compose } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";
import { helmetPlugin } from "../../plugins/helmet.js";
import { rateLimitPlugin } from "../../plugins/rate-limit.js";

// Compose security plugins
const securityPlugins = compose(cors({ origin: "https://example.com" }), helmetPlugin(), rateLimitPlugin({ max: 100 }));

export const meta = {
  plugins: [securityPlugins],
};

export default async function (app) {
  app.get("/secure", () => "protected");
}
```

```typescript [src/module.ts]
import { compose, hook } from "@minimajs/server";

// Group lifecycle hooks
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
  plugins: [appLifecycle],
};

export default async function (app) {
  app.get("/health", () => "ok");
}
```

:::

### `compose.create()` for Modules with `app.register()`

`compose.create()` creates a wrapper that applies plugins to modules when using `app.register()`. **This is only useful for manual module registration, not for `meta.plugins`.**

::: code-group

```typescript [src/index.ts]
import { createApp, compose } from "@minimajs/server";
import { authPlugin } from "./plugins/auth.js";
import { loggingPlugin } from "./plugins/logging.js";

const app = createApp({ moduleDiscovery: false });

// Create a wrapper with common plugins
const withAuthAndLogging = compose.create(authPlugin, loggingPlugin);

// Manually register modules wrapped with plugins
app.register(
  withAuthAndLogging(async (app) => {
    app.get("/users", () => "users");
  }),
  { prefix: "/api" }
);

await app.listen({ port: 3000 });
```

:::

## Best Practices

1.  **Keep Plugins Focused**: Each plugin should have a single, clear responsibility
1.  **Use Composition for Reusability**: Group related hooks and setup logic with `compose()`
1.  **Order Matters in Composition**: Plugins execute in the order they're defined in the array

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
    }),
  ],
};

export default async function (app) {
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
  plugins: [requestLogger],
};

export default async function (app) {
  app.get("/health", () => "ok");
}
```

:::

### Database Connection

::: code-group

```typescript [database/connection.ts]
import { plugin, hook } from "@minimajs/server";

interface DbOptions {
  connectionString: string;
  poolSize?: number;
}

export const connectDatabase = (options: DbOptions) =>
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
import { connectDatabase } from "../database/connection.js";

// Register database plugin in root module
export const meta = {
  plugins: [
    connectDatabase({
      connectionString: process.env.DATABASE_URL!,
    }),
  ],
};

export default async function (app) {
  app.get("/health", () => "ok");
}
```

:::

---

## Manual Registration (Alternative)

If you're not using module discovery or need to register plugins in your entry file, use `app.register()`.

```typescript
import { createApp } from "@minimajs/server/bun";
import { authPlugin } from "./plugins/auth.js";

const app = createApp({ moduleDiscovery: false });

app.register(authPlugin({ secretKey: process.env.JWT_SECRET! }));

await app.listen({ port: 3000 });
```

**When to use:**

- Apps without module discovery
- Registering global plugins in entry files
- Quick prototypes or single-file apps

**Recommended:** Use `meta.plugins` in module files for better organization.

---

## Plugin vs. Module

When using `app.register()`, understanding the scoping difference between plugins and modules is crucial.

### The Key Difference: Scoping

**Plugin** wraps logic with `plugin()` - extends the current scope:

```typescript
import { createApp, plugin, hook } from "@minimajs/server/bun";

const loggerPlugin = plugin(async function logger(app) {
  app.register(hook("request", () => console.log("Logged")));
});

const app = createApp({ moduleDiscovery: false });

// Register plugin - it extends the root scope
app.register(loggerPlugin);

// This route gets the logger hook
app.get("/users", () => "users");

// This module also inherits the logger hook
app.register(
  async (app) => {
    app.get("/list", () => "posts"); // ✅ Logger runs here too
  },
  { prefix: "/posts" }
);
```

**Module** is a plain function - creates an isolated scope:

```typescript
import { createApp, hook } from "@minimajs/server/bun";

const app = createApp({ moduleDiscovery: false });

// Register a module - creates isolated scope
app.register(
  async (app) => {
    // Hook registered here stays isolated
    app.register(hook("request", () => console.log("Users only")));

    app.get("/list", () => "users"); // ✅ Hook runs here
  },
  { prefix: "/users" }
);

// This sibling module doesn't get the hook
app.register(
  async (app) => {
    app.get("/list", () => "posts"); // ❌ Hook does NOT run here
  },
  { prefix: "/posts" }
);
```

### When to Use Each

| Feature         | Plugin (`plugin()`)            | Module (`async function`)        |
| --------------- | ------------------------------ | -------------------------------- |
| **Scope**       | Extends **current** scope      | Creates **new isolated** scope   |
| **Use Case**    | Global hooks, middleware, auth | Feature routes, isolated logic   |
| **Inheritance** | Children inherit it            | Children inherit, siblings don't |

**Use plugin when:** You want hooks/middleware to apply to everything registered after it (global auth, logging, CORS)

**Use module when:** You want to isolate a feature's routes and logic from other parts of the app

> For a deeper dive into modules and auto-discovery, see the [Modules guide](/core-concepts/modules).

## See Also

- [Hooks](/guides/hooks)
- [Modules](/core-concepts/modules)
