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

A plugin is a reusable component that extends your application's functionality. Plugins work within the current scope without creating nested isolation, making them different from [modules](/guide/module).

### Plugin vs Module

**Module** (creates a new isolated scope):
```typescript
// This is a MODULE - creates a new nested scope
app.register(async function userModule(app, opts) {
  // This creates a child scope
  // Routes and hooks here are isolated from siblings
  app.get('/users', () => getUsers());
});
```

**Plugin** (extends the current scope):
```typescript
import { plugin } from "@minimajs/server";

// This is a PLUGIN - extends the current scope
app.register(plugin(async function authPlugin(app, opts) {
  // This modifies the CURRENT scope (not a child scope)
  // Available to other plugins/routes registered at this level
  app.addHook('onRequest', authMiddleware);
}));
```

The key difference: plugins extend the current scope where they're registered, while modules create new nested scopes. This makes plugins perfect for:

- Adding hooks and middleware at the current level
- Composing multiple utilities together
- Extending functionality without scope boundaries
- Creating reusable components that work alongside other plugins

Learn more about modules and scope isolation in the [Module guide](/guide/module).

## Creating Plugins

Minima.js provides two functions for creating plugins: `plugin` for async plugins and `plugin.sync` for synchronous plugins.

### plugin

Creates an asynchronous plugin that extends the current scope.

```typescript
plugin<T>(fn: PluginCallback<T>, name?: string): Plugin
```

**Parameters:**
- `fn`: An async function that receives `app` and `opts`
- `name`: Optional name for debugging and logging

**Example:**

```typescript
import { plugin } from "@minimajs/server";

const databasePlugin = plugin(async function database(app, opts) {
  // Perform async initialization
  await db.connect();

  // Add routes
  app.get('/health/db', async () => {
    const isConnected = await db.ping();
    return { database: isConnected ? 'connected' : 'disconnected' };
  });

  // Add cleanup hook
  app.addHook('onClose', async () => {
    await db.disconnect();
  });
}, 'database');

app.register(databasePlugin);
```

### plugin.sync

Creates a synchronous plugin using the callback pattern.

```typescript
plugin.sync<T>(fn: PluginCallbackSync<T>, name?: string): Plugin
```

**Parameters:**
- `fn`: A function that receives `app`, `opts`, and optionally `done` callback
- `name`: Optional name for debugging and logging (defaults to function name)

**Auto-completion behavior:**
- If your function has **fewer than 3 parameters**, `done()` is called automatically
- If your function has **3 parameters**, you **must** call `done()` manually
- This prevents plugins from getting stuck if you forget to call `done()`

**Example with auto-completion (recommended for simple plugins):**

```typescript
import { plugin } from "@minimajs/server";

// No done() needed - called automatically
const corsPlugin = plugin.sync(function cors(app, opts) {
  app.addHook('onRequest', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  });
  // done() is called automatically
}, 'cors');

app.register(corsPlugin);
```

**Example with manual done() (for async operations or error handling):**

```typescript
import { plugin } from "@minimajs/server";

const configPlugin = plugin.sync(function config(app, opts, done) {
  // Load config asynchronously
  loadConfig((err, config) => {
    if (err) return done(err); // Pass error to done

    app.decorate('config', config);
    done(); // Must call done when finished
  });
}, 'config');

app.register(configPlugin);
```

### Plugin Options

Plugins can accept custom options. All plugins automatically support the `prefix` option for route namespacing.

```typescript
interface ApiPluginOptions {
  apiKey: string;
  timeout?: number;
}

const apiPlugin = plugin<ApiPluginOptions>(async function api(app, opts) {
  const { apiKey, timeout = 5000, prefix } = opts;

  app.get('/data', async () => {
    const response = await fetch('https://api.example.com', {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(timeout)
    });
    return response.json();
  });
});

// Register with options
app.register(apiPlugin, {
  apiKey: process.env.API_KEY,
  timeout: 10000,
  prefix: '/api/v1'
});

// Route available at: /api/v1/data
```

## plugin.compose

Combines multiple plugins into a single plugin that executes them sequentially.

```typescript
plugin.compose<Opts>(...plugins: Plugin<Opts>[]): Plugin
```

**Parameters:**
- `...plugins`: One or more plugins to compose together

**Returns:** A new plugin that executes all provided plugins in order

**Features:**
- Executes plugins **sequentially** in the order provided
- Supports both sync and async plugins
- Automatically waits for async plugins to complete
- Passes the same options to all composed plugins
- Handles errors from any plugin in the composition
- Works with nested composition

**Basic Example:**

```typescript
import { createApp, plugin } from "@minimajs/server";

const plugin1 = plugin.sync(function setup(app, opts) {
  console.log('Setting up...');
  // done() called automatically
});

const plugin2 = plugin(async function initialize(app, opts) {
  console.log('Initializing...');
  await someAsyncWork();
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

## Practical Examples

### Authentication Plugin

```typescript
import { plugin } from "@minimajs/server";

interface AuthOptions {
  secretKey: string;
  excludePaths?: string[];
}

const authPlugin = plugin<AuthOptions>(async function auth(app, opts) {
  const { secretKey, excludePaths = [] } = opts;

  app.addHook('onRequest', async (req, res) => {
    // Skip auth for excluded paths
    if (excludePaths.includes(req.url)) return;

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    try {
      const user = await verifyToken(token, secretKey);
      req.user = user; // Attach user to request
    } catch (err) {
      res.code(401).send({ error: 'Invalid token' });
    }
  });
});

app.register(authPlugin, {
  secretKey: process.env.JWT_SECRET,
  excludePaths: ['/login', '/register']
});
```

### Logging Plugin

```typescript
import { plugin } from "@minimajs/server";

const requestLogger = plugin(async function logger(app, opts) {
  app.addHook('onRequest', (req) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  });

  app.addHook('onSend', (req, res, payload) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode}`);
  });
});

app.register(requestLogger);
```

### Database Connection Plugin

```typescript
import { plugin } from "@minimajs/server";

interface DbOptions {
  connectionString: string;
  poolSize?: number;
}

const dbPlugin = plugin<DbOptions>(async function database(app, opts) {
  const { connectionString, poolSize = 10 } = opts;

  // Connect on app ready
  app.addHook('onReady', async () => {
    await db.connect(connectionString, { poolSize });
    console.log('Database connected');
  });

  // Disconnect on app close
  app.addHook('onClose', async () => {
    await db.disconnect();
    console.log('Database disconnected');
  });

  // Add health check route
  app.get('/health/db', async () => {
    const isHealthy = await db.ping();
    return { status: isHealthy ? 'healthy' : 'unhealthy' };
  });
});

app.register(dbPlugin, {
  connectionString: process.env.DATABASE_URL
});
```

## Best Practices

1. **Name your plugins** - Always provide a descriptive name for better debugging and logging
   ```typescript
   const myPlugin = plugin(async function myDescriptiveName(app, opts) {
     // ...
   }, 'myDescriptiveName');
   ```

2. **Use composition for related functionality** - Group lifecycle hooks and related setup together
   ```typescript
   const dbSetup = plugin.compose(
     hook('ready', connectDatabase),
     hook('close', disconnectDatabase)
   );
   ```

3. **Keep plugins focused** - Each plugin should have a single, clear responsibility
   - ✅ Good: `authPlugin`, `loggingPlugin`, `corsPlugin`
   - ❌ Bad: `everythingPlugin` that does auth + logging + CORS

4. **Handle errors properly** - Always handle async errors in plugins
   ```typescript
   const safePlugin = plugin(async function safe(app, opts) {
     try {
       await riskyOperation();
     } catch (error) {
       app.log.error(error);
       throw error; // Re-throw to prevent app startup
     }
   });
   ```

5. **Use TypeScript for plugin options** - Define interfaces for better type safety
   ```typescript
   interface MyPluginOptions {
     required: string;
     optional?: number;
   }

   const myPlugin = plugin<MyPluginOptions>(async function(app, opts) {
     // TypeScript will enforce the options type
   });
   ```

## Quick Reference

| Feature | Plugin | Module |
|---------|--------|--------|
| Scope | Extends current scope | Creates new isolated scope |
| Use case | Hooks, middleware, utilities | Feature modules, route groups |
| Context isolation | No (same context) | Yes (child context) |
| Created with | `plugin()` or `plugin.sync()` | Plain `async function` |
| Example | Authentication, logging | User routes, admin panel |

## See Also

- [Hooks](/guide/http#hooks) - Learn about lifecycle hooks
- [Middleware](/guide/middleware) - Learn about middleware and interceptors
- [Module](/guide/module) - Learn about creating modules
