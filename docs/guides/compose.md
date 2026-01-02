# compose

The `compose` API provides utilities for combining multiple plugins and modules into a single cohesive unit. It offers two main functions:

- **`compose(...plugins)`** - Combines multiple plugins into one
- **`compose.create(...plugins)`** - Creates a reusable plugin applicator

## Table of Contents

- [compose()](#compose)
- [compose.create()](#composecreate)
- [Plugins vs Modules](#plugins-vs-modules)
- [Use Cases](#use-cases)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## compose()

Composes multiple plugins/modules into a single plugin that registers all of them sequentially.

### Signature

```typescript
function compose<T extends PluginOptions = any>(...plugins: (Plugin<T> | PluginSync)[]): Plugin<T>;
```

### Parameters

- **`plugins`** - Variable number of plugins or modules to compose

### Returns

A single plugin that registers all provided plugins in order.

### Basic Usage

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";
import { compose, hook, plugin } from "@minimajs/server";

const app = createApp();

// Compose lifecycle hooks
const dbPlugin = compose(
  hook("ready", async () => await db.connect()),
  hook("close", async () => await db.close())
);

app.register(dbPlugin);
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";
import { compose, hook, plugin } from "@minimajs/server";

const app = createApp();

// Compose lifecycle hooks
const dbPlugin = compose(
  hook("ready", async () => await db.connect()),
  hook("close", async () => await db.close())
);

app.register(dbPlugin);
```

:::

### Composing Feature Modules

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";
import { compose, type App } from "@minimajs/server";

const app = createApp();

// Individual feature modules (plain async functions)
async function authModule(app: App) {
  app.post("/login", loginHandler);
  app.post("/logout", logoutHandler);
}

async function usersModule(app: App) {
  app.get("/users", getUsersHandler);
  app.post("/users", createUserHandler);
}

async function postsModule(app: App) {
  app.get("/posts", getPostsHandler);
  app.post("/posts", createPostHandler);
}

// Combine all modules into one API plugin
const apiModule = compose(authModule, usersModule, postsModule);

app.register(apiModule);
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";
import { compose, type App } from "@minimajs/server";

const app = createApp();

// Individual feature modules (plain async functions)
async function authModule(app: App) {
  app.post("/login", loginHandler);
  app.post("/logout", logoutHandler);
}

async function usersModule(app: App) {
  app.get("/users", getUsersHandler);
  app.post("/users", createUserHandler);
}

async function postsModule(app: App) {
  app.get("/posts", getPostsHandler);
  app.post("/posts", createPostHandler);
}

// Combine all modules into one API plugin
const apiModule = compose(authModule, usersModule, postsModule);

app.register(apiModule);
```

:::

### Execution Order

Plugins are executed in the order they are provided:

```typescript
const combined = compose(plugin1, plugin2, plugin3);
// Execution order: plugin1 → plugin2 → plugin3
```

### With Options

All composed plugins receive the same options:

```typescript
interface ApiOptions {
  prefix: string;
  version: number;
}

const plugin1 = plugin<ApiOptions>((app, opts) => {
  console.log(opts.prefix); // '/api'
  console.log(opts.version); // 2
});

const plugin2 = plugin<ApiOptions>((app, opts) => {
  console.log(opts.prefix); // '/api'
  console.log(opts.version); // 2
});

const combined = compose(plugin1, plugin2);

app.register(combined, { prefix: "/api", version: 2 });
```

---

## Plugins vs Modules

Understanding the difference between plugins and modules is crucial:

### Module (Plain Async Function)

A module is a simple async function that receives an App instance:

```typescript
import type { App } from "@minimajs/server";

// This is a MODULE
async function usersModule(app: App) {
  app.get("/users", () => ({ users: [] }));
  app.post("/users", createUserHandler);
}

// Modules can be registered directly
app.register(usersModule);
```

### Plugin (Wrapped Function)

A plugin is a module wrapped with the `plugin()` function for metadata and special behavior:

```typescript
import { plugin, type App } from "@minimajs/server";

// This is a PLUGIN
const usersPlugin = plugin(async (app: App) => {
  app.get("/users", () => ({ users: [] }));
  app.post("/users", createUserHandler);
}, "users-plugin");

// Plugins are also registered the same way
app.register(usersPlugin);
```

### When to Use Each

- **Use modules** (plain functions) for simple application logic
- **Use plugins** (wrapped) when you need:
  - Named plugins for debugging
  - Skip override behavior
  - Metadata attachment

Both work with `compose()` and `compose.create()`, but for clarity in this guide, we'll primarily use plain module functions.

---

## compose.create()

Creates a higher-order function that applies multiple plugins to a module. This is useful for creating reusable plugin configurations that can be applied to different modules.

### Signature

```typescript
function create<T extends PluginOptions = any>(
  ...plugins: (Plugin<T> | PluginSync)[]
): (module: Plugin<T> | PluginSync) => Plugin<T>;
```

### Parameters

- **`plugins`** - Variable number of plugins to be pre-applied

### Returns

A function that takes a module and returns a new composed plugin with all plugins applied before the module.

### Basic Usage

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";
import { compose, type App } from "@minimajs/server";

const app = createApp();

// Create a composer with common plugins
const withAuth = compose.create(authPlugin, loggingPlugin);

// Define modules as plain async functions
async function usersModule(app: App) {
  app.get("/users", () => ({ users: [] }));
}

async function postsModule(app: App) {
  app.get("/posts", () => ({ posts: [] }));
}

// Both modules will have auth and logging
app.register(withAuth(usersModule));
app.register(withAuth(postsModule));
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";
import { compose, type App } from "@minimajs/server";

const app = createApp();

// Create a composer with common plugins
const withAuth = compose.create(authPlugin, loggingPlugin);

// Define modules as plain async functions
async function usersModule(app: App) {
  app.get("/users", () => ({ users: [] }));
}

async function postsModule(app: App) {
  app.get("/posts", () => ({ posts: [] }));
}

// Both modules will have auth and logging
app.register(withAuth(usersModule));
app.register(withAuth(postsModule));
```

:::

### Execution Order

Plugins are executed before the module:

```typescript
const withPlugins = compose.create(plugin1, plugin2);
const result = withPlugins(myModule);

// Execution order: plugin1 → plugin2 → myModule
```

### Reusing Composers

Create a composer once and apply it to multiple modules:

```typescript
// Define standard middleware
const withStandardMiddleware = compose.create(corsPlugin, helmetPlugin, rateLimitPlugin, compressionPlugin);

// Apply to different API modules
app.register(withStandardMiddleware(v1ApiModule));
app.register(withStandardMiddleware(v2ApiModule));
app.register(withStandardMiddleware(adminModule));
```

### Chaining Composers

Composers can be chained together for maximum flexibility:

```typescript
const withAuth = compose.create(authPlugin);
const withLogging = compose.create(loggingPlugin);
const withCaching = compose.create(cachingPlugin);

// Module as plain async function
async function myModule(app: App) {
  app.get("/data", getData);
}

// Chain multiple composers
app.register(withAuth(withLogging(withCaching(myModule))));

// Execution order: auth → logging → caching → module
```

### With Lifecycle Hooks

```typescript
const withLifecycle = compose.create(
  hook("ready", async () => {
    await setupResources();
  }),
  hook("close", async () => {
    await cleanupResources();
  })
);

// Apply lifecycle to multiple modules
app.register(withLifecycle(databaseModule));
app.register(withLifecycle(cacheModule));
```

---

## Use Cases

### 1. Database Lifecycle Management

```typescript
const dbLifecycle = compose(
  hook("ready", async () => {
    await database.connect();
    await database.runMigrations();
  }),
  hook("close", async () => {
    await database.disconnect();
  })
);

app.register(dbLifecycle);
```

### 2. Reusable Middleware Stack

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

### 3. Feature Modules

```typescript
import type { App } from "@minimajs/server";

// Define modules as plain async functions
async function userAuthModule(app: App) {
  app.post("/auth/login", loginHandler);
  app.post("/auth/logout", logoutHandler);
}

async function userProfileModule(app: App) {
  app.get("/profile", getProfileHandler);
  app.put("/profile", updateProfileHandler);
}

async function userSettingsModule(app: App) {
  app.get("/settings", getSettingsHandler);
  app.patch("/settings", updateSettingsHandler);
}

async function userNotificationsModule(app: App) {
  app.get("/notifications", getNotificationsHandler);
}

// Organize related routes into modules
const userFeatures = compose(userAuthModule, userProfileModule, userSettingsModule, userNotificationsModule);

async function adminDashboardModule(app: App) {
  app.get("/admin/dashboard", dashboardHandler);
}

async function adminUsersModule(app: App) {
  app.get("/admin/users", listUsersHandler);
}

async function adminAnalyticsModule(app: App) {
  app.get("/admin/analytics", analyticsHandler);
}

const adminFeatures = compose(adminDashboardModule, adminUsersModule, adminAnalyticsModule);

app.register(userFeatures);
app.register(adminFeatures);
```

### 4. Environment-Specific Setup

```typescript
const developmentPlugins = compose(loggingPlugin({ level: "debug" }), devToolsPlugin(), hotReloadPlugin());

const productionPlugins = compose(loggingPlugin({ level: "error" }), monitoringPlugin(), analyticsPlugin());

const plugins = process.env.NODE_ENV === "production" ? productionPlugins : developmentPlugins;

app.register(plugins);
```

### 5. Microservices Composition

```typescript
// Create composers for different concerns
const withObservability = compose.create(metricsPlugin(), tracingPlugin(), healthCheckPlugin());

const withResilience = compose.create(retryPlugin(), circuitBreakerPlugin(), timeoutPlugin());

// Compose microservices
const userService = plugin((app) => {
  app.get("/api/users", getUsersHandler);
  app.post("/api/users", createUserHandler);
});

const orderService = plugin((app) => {
  app.get("/api/orders", getOrdersHandler);
  app.post("/api/orders", createOrderHandler);
});

// Apply concerns to services
app.register(withObservability(withResilience(userService)));

app.register(withObservability(withResilience(orderService)));
```

### 6. Testing Setup

```typescript
const withTestSetup = compose.create(
  hook("ready", async () => {
    await setupTestDatabase();
    await seedTestData();
  }),
  hook("close", async () => {
    await cleanupTestDatabase();
  })
);

// Use in tests
const testModule = plugin((app) => {
  app.get("/test-endpoint", testHandler);
});

app.register(withTestSetup(testModule));
```

---

## Examples

### Example 1: Multi-tenant Application

```typescript
import { compose, plugin, hook } from "@minimajs/server";

// Tenant isolation plugins
const tenantContextPlugin = plugin((app) => {
  // Add tenant context to requests
  app.decorateRequest("tenant", null);
});

const tenantDatabasePlugin = hook("ready", async () => {
  // Initialize tenant-specific database connections
  await initTenantDatabases();
});

// Create tenant-aware composer
const withTenantSupport = compose.create(tenantContextPlugin, tenantDatabasePlugin);

// Apply to modules
const tenantsModule = plugin((app) => {
  app.get("/api/tenants/:id", getTenantHandler);
});

const resourcesModule = plugin((app) => {
  app.get("/api/resources", getResourcesHandler);
  app.post("/api/resources", createResourceHandler);
});

app.register(withTenantSupport(tenantsModule));
app.register(withTenantSupport(resourcesModule));
```

### Example 2: Plugin Pipeline

```typescript
import { compose } from "@minimajs/server";

// Request processing pipeline
const requestPipeline = compose(
  // 1. Parse and validate
  bodyParserPlugin(),
  validationPlugin(),

  // 2. Security
  csrfProtectionPlugin(),
  sanitizationPlugin(),

  // 3. Business logic
  businessLogicPlugin(),

  // 4. Response formatting
  responseFormatterPlugin(),
  compressionPlugin()
);

app.register(requestPipeline);
```

### Example 3: Conditional Composition

```typescript
import { compose, plugin } from "@minimajs/server";

const corePlugins = [loggingPlugin(), errorHandlerPlugin()];

const securityPlugins = process.env.ENABLE_SECURITY === "true" ? [authPlugin(), rateLimitPlugin(), corsPlugin()] : [];

const monitoringPlugins = process.env.ENABLE_MONITORING === "true" ? [metricsPlugin(), tracingPlugin()] : [];

const allPlugins = compose(...corePlugins, ...securityPlugins, ...monitoringPlugins);

app.register(allPlugins);
```

### Example 4: Module Factory Pattern

```typescript
import { compose, plugin } from "@minimajs/server";

function createCrudModule(resource: string) {
  return plugin((app) => {
    app.get(`/api/${resource}`, () => getAll(resource));
    app.get(`/api/${resource}/:id`, () => getOne(resource));
    app.post(`/api/${resource}`, () => create(resource));
    app.put(`/api/${resource}/:id`, () => update(resource));
    app.delete(`/api/${resource}/:id`, () => remove(resource));
  });
}

const withValidation = compose.create(validationPlugin());
const withAuth = compose.create(authPlugin());

const apiModules = compose(
  withAuth(withValidation(createCrudModule("users"))),
  withAuth(withValidation(createCrudModule("posts"))),
  withAuth(withValidation(createCrudModule("comments")))
);

app.register(apiModules);
```

---

## Best Practices

### 1. Keep Compositions Focused

Group related plugins together and give them meaningful names:

```typescript
// Good: Clear purpose
const withAuthentication = compose.create(sessionPlugin(), jwtPlugin(), authMiddleware());

// Avoid: Too many unrelated concerns
const withEverything = compose.create(authPlugin(), loggingPlugin(), databasePlugin(), emailPlugin(), cachePlugin());
```

### 2. Order Matters

Place plugins in logical order:

```typescript
// Good: Logical order
const withSecurity = compose.create(
  corsPlugin(), // 1. CORS first
  helmetPlugin(), // 2. Security headers
  rateLimitPlugin(), // 3. Rate limiting
  authPlugin() // 4. Authentication last
);

// Avoid: Illogical order
const withSecurity = compose.create(
  authPlugin(), // Auth before CORS?
  rateLimitPlugin(),
  corsPlugin(),
  helmetPlugin()
);
```

### 3. Use Meaningful Names

```typescript
// Good: Descriptive names
const withStandardMiddleware = compose.create(...);
const withDatabaseLifecycle = compose.create(...);
const withMonitoring = compose.create(...);

// Avoid: Generic names
const middleware = compose.create(...);
const stuff = compose.create(...);
const plugins = compose.create(...);
```

### 4. Avoid Deep Nesting

```typescript
// Good: Flat composition
const withAll = compose.create(plugin1, plugin2, plugin3, plugin4);

app.register(withAll(myModule));

// Avoid: Deep nesting
app.register(with1(with2(with3(with4(myModule)))));
```

### 5. Document Composed Plugins

```typescript
/**
 * Applies standard security middleware to a module.
 * Includes CORS, Helmet, rate limiting, and authentication.
 */
const withSecurity = compose.create(corsPlugin(), helmetPlugin(), rateLimitPlugin(), authPlugin());

/**
 * Adds observability features to a module.
 * Includes metrics, tracing, and health checks.
 */
const withObservability = compose.create(metricsPlugin(), tracingPlugin(), healthCheckPlugin());
```

### 6. Type Safety

Use TypeScript generics for type-safe compositions:

```typescript
interface ApiOptions extends PluginOptions {
  version: string;
  prefix: string;
}

const plugin1 = plugin<ApiOptions>((app, opts) => {
  console.log(opts.version); // Type-safe
});

const plugin2 = plugin<ApiOptions>((app, opts) => {
  console.log(opts.prefix); // Type-safe
});

const withApi = compose.create<ApiOptions>(plugin1, plugin2);

// TypeScript ensures correct options
app.register(withApi(myModule), {
  version: "v1",
  prefix: "/api",
});
```

### 7. Testing Compositions

Test composed plugins thoroughly:

```typescript
import { describe, test, expect } from "@jest/globals";
import { createApp } from "@minimajs/server";

describe("withSecurity composition", () => {
  test("should apply all security plugins", async () => {
    const app = createApp();
    const testModule = plugin((app) => {
      app.get("/test", () => "ok");
    });

    app.register(withSecurity(testModule));

    const response = await app.inject("/test");

    // Verify CORS headers
    expect(response.headers.get("access-control-allow-origin")).toBeDefined();

    // Verify Helmet headers
    expect(response.headers.get("x-frame-options")).toBeDefined();

    // Verify rate limit headers
    expect(response.headers.get("x-ratelimit-limit")).toBeDefined();
  });
});
```

---

## API Reference

### compose(...plugins)

**Type:** `<T extends PluginOptions = any>(...plugins: (Plugin<T> | PluginSync)[]) => Plugin<T>`

Combines multiple plugins into a single plugin.

**Example:**

```typescript
const combined = compose(plugin1, plugin2, plugin3);
app.register(combined);
```

### compose.create(...plugins)

**Type:** `<T extends PluginOptions = any>(...plugins: (Plugin<T> | PluginSync)[]) => (module: Plugin<T> | PluginSync) => Plugin<T>`

Creates a higher-order function for applying plugins to modules.

**Example:**

```typescript
const withPlugins = compose.create(plugin1, plugin2);
app.register(withPlugins(myModule));
```

---

## Related

- [Plugin API](/docs/api/plugin.md)
- [Hooks API](/docs/api/hooks.md)
- [Module System](/docs/guides/modules.md)
