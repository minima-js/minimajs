# Container and Encapsulation

Minima.js uses a container system to manage application state and plugin settings with automatic encapsulation. The container allows you to store configuration, database connections, and other resources in a way that respects module boundaries.

## What is a Container?

The container is a storage object accessible via `app.container` that uses Symbol keys to avoid naming collisions. You can store any data your plugins or application needs:

```typescript
const kMyData = Symbol("my-data");

app.register((instance) => {
  // Store data in container
  instance.container[kMyData] = { some: "data" };

  // Access later
  const data = instance.container[kMyData];
});
```

## Encapsulation

When you register a plugin or module, Minima.js creates a **new child context with a cloned container**. This ensures plugin isolation while maintaining inheritance from the parent.

### How Encapsulation Works

The container uses three cloning strategies:

| Value Type             | Behavior             | Example                         |
| ---------------------- | -------------------- | ------------------------------- |
| Array                  | Shallow copy         | Module chains, arrays of config |
| Object with `.clone()` | Deep copy via method | Custom settings classes         |
| Everything else        | Shared reference     | Database pools, primitives      |

This means:

- **Arrays** in child modules don't affect parent arrays
- **Cloneable objects** get independent copies
- **Other values** (objects, connections, primitives) are **shared** across modules

### Example: Basic Encapsulation

```typescript
const kConfig = Symbol("config");

// Root level - shared reference
app.container[kConfig] = { timeout: 5000 };

app.register((child) => {
  // Child inherits the same reference
  console.log(child.container[kConfig]); // { timeout: 5000 }

  // To isolate: create new object
  child.container[kConfig] = { timeout: 10000 };
});
```

## Common Use Cases

### 1. Shared Database Connection

Store database pools that are shared across all modules:

```typescript
const kDbPool = Symbol("database-pool");

export function databasePlugin(connectionString: string) {
  return async (app: App) => {
    const pool = await createPool(connectionString);

    // Store in container (shared by reference)
    app.container[kDbPool] = pool;

    // Clean up on shutdown
    app.register(
      hook("close", async () => {
        await pool.end();
      })
    );
  };
}

// Access in any route
app.register(databasePlugin("postgresql://..."));

app.get("/users", async (ctx) => {
  const pool = ctx.app.container[kDbPool];
  const result = await pool.query("SELECT * FROM users");
  return result.rows;
});
```

### 2. Module-Specific Settings

Override settings for specific modules:

```typescript
const kTheme = Symbol("theme");

// Root theme
app.container[kTheme] = "light";

app.get("/", (ctx) => {
  return { theme: ctx.app.container[kTheme] }; // "light"
});

// Admin module with different theme
app.register((admin) => {
  admin.container[kTheme] = "dark";

  admin.get("/admin", (ctx) => {
    return { theme: ctx.app.container[kTheme] }; // "dark"
  });
});
```

### 3. Feature Flags

Manage feature flags with inheritance:

```typescript
const kFeatures = Symbol("features");

interface Features {
  newUI: boolean;
  betaAPI: boolean;
}

// Root features
app.container[kFeatures] = {
  newUI: false,
  betaAPI: false,
};

// Beta module enables beta features
app.register("/beta", (beta) => {
  // Override with new object
  beta.container[kFeatures] = {
    ...beta.container[kFeatures],
    betaAPI: true,
  };

  beta.get("/feature", (ctx) => {
    const features = ctx.app.container[kFeatures] as Features;
    if (!features.betaAPI) {
      throw new Error("Beta API not enabled");
    }
    return { status: "beta" };
  });
});
```

### 4. Cloneable Configuration Objects

For more control over encapsulation, create objects with a `.clone()` method:

```typescript
const kSettings = Symbol("settings");

class Settings {
  constructor(
    public timeout: number,
    public retries: number
  ) {}

  clone(): Settings {
    return new Settings(this.timeout, this.retries);
  }
}

// Root settings
app.container[kSettings] = new Settings(5000, 3);

// Child gets automatic clone
app.register((child) => {
  const settings = child.container[kSettings] as Settings;
  settings.timeout = 10000; // Only affects child

  console.log(app.container[kSettings].timeout); // 5000
  console.log(child.container[kSettings].timeout); // 10000
});
```

## Multi-Tenant Applications

Containers are perfect for multi-tenant scenarios where each request needs tenant-specific resources:

```typescript
const kTenant = Symbol("tenant");
const kDatabase = Symbol("database");

interface Tenant {
  id: string;
  name: string;
  dbName: string;
}

// Identify tenant from request
app.addHook("request", async (ctx) => {
  const subdomain = ctx.request.headers.get("host")?.split(".")[0];

  const tenant = await findTenant(subdomain);
  ctx.app.container[kTenant] = tenant;

  // Get tenant-specific database
  const db = await getDatabase(tenant.dbName);
  ctx.app.container[kDatabase] = db;
});

// Routes automatically have tenant context
app.get("/data", async (ctx) => {
  const tenant = ctx.app.container[kTenant] as Tenant;
  const db = ctx.app.container[kDatabase];

  const data = await db.query("SELECT * FROM data");
  return { tenant: tenant.name, data };
});
```

## Best Practices

### 1. Always Use Symbol Keys

Symbols prevent naming collisions between plugins:

```typescript
// Good - unique per plugin
export const kMyPlugin = Symbol("my-plugin");

// Bad - can collide (also TypeScript error)
app.container["myPlugin"] = data;
```

### 2. Export Your Symbols

Allow users to access your plugin's container data:

```typescript
// plugin.ts
export const kAuth = Symbol("auth");

export function authPlugin() {
  return (app: App) => {
    app.container[kAuth] = createAuthState();
  };
}

// user.ts
import { kAuth } from "./plugin.ts";

app.get("/", (ctx) => {
  const auth = ctx.app.container[kAuth];
});
```

### 3. Clean Up Resources

Always clean up in the `close` hook:

```typescript
app.register((instance) => {
  const resource = createResource();
  instance.container[kResource] = resource;

  instance.addHook("close", async () => {
    await resource.cleanup();
  });
});
```

### 4. Type Your Container Values

Create typed helpers for better DX:

```typescript
const kConfig = Symbol("config");

interface Config {
  apiKey: string;
  timeout: number;
}

function getConfig(app: App): Config {
  if (!(kConfig in app.container)) {
    throw new Error("Config not initialized");
  }
  return app.container[kConfig] as Config;
}

function setConfig(app: App, config: Config): void {
  app.container[kConfig] = config;
}

// Usage with type safety
app.register((instance) => {
  setConfig(instance, {
    apiKey: "secret",
    timeout: 5000,
  });
});

app.get("/", (ctx) => {
  const config = getConfig(ctx.app);
  return { timeout: config.timeout };
});
```

### 5. Prefer Immutability

Create new objects instead of mutating shared ones:

```typescript
// Good - creates new object
child.container[kConfig] = {
  ...parent.container[kConfig],
  newValue: true,
};

// Bad - mutates parent's config
(child.container[kConfig] as any).newValue = true;
```

## Encapsulation in Action

### Example: Isolated Error Handlers

Different modules can have different error handling:

```typescript
const kErrorFormat = Symbol("error-format");

// Root error format
app.container[kErrorFormat] = "json";

app.setErrorHandler((error, ctx) => {
  const format = ctx.app.container[kErrorFormat];
  if (format === "json") {
    return { error: error.message };
  }
  return error.message;
});

// API module uses JSON (inherited)
app.register("/api", (api) => {
  api.get("/data", () => {
    throw new Error("API error");
    // Returns: { error: "API error" }
  });
});

// Admin module uses plain text
app.register("/admin", (admin) => {
  admin.container[kErrorFormat] = "text";

  admin.get("/panel", () => {
    throw new Error("Admin error");
    // Returns: "Admin error"
  });
});
```

### Example: Per-Module Rate Limiting

Apply different rate limits to different modules:

```typescript
const kRateLimit = Symbol("rate-limit");

interface RateLimit {
  requests: number;
  window: number;
}

// Default rate limit
app.container[kRateLimit] = { requests: 100, window: 60000 };

// Public API - strict limits
app.register("/api/public", (pub) => {
  pub.container[kRateLimit] = { requests: 10, window: 60000 };

  pub.addHook("request", async (ctx) => {
    const limit = ctx.app.container[kRateLimit] as RateLimit;
    await checkRateLimit(ctx.request, limit);
  });
});

// Internal API - relaxed limits
app.register("/api/internal", (internal) => {
  internal.container[kRateLimit] = { requests: 1000, window: 60000 };
});
```

## Understanding Inheritance

Container values follow the module hierarchy:

```typescript
const kValue = Symbol("value");

app.container[kValue] = "root";

app.register("/level1", (l1) => {
  console.log(l1.container[kValue]); // "root" - inherited

  l1.register("/level2", (l2) => {
    console.log(l2.container[kValue]); // "root" - inherited

    // Override for this branch
    l2.container[kValue] = "level2";

    l2.register("/level3", (l3) => {
      console.log(l3.container[kValue]); // "level2" - inherited from parent
    });
  });
});

// Sibling branch still has root value
app.register("/other", (other) => {
  console.log(other.container[kValue]); // "root"
});
```

## Next Steps

- Learn about [Custom Adapters](./custom-adapters.md)
- Explore [Plugin Development](../core-concepts/plugins.md)
- See [Architecture Overview](../core-concepts/architecture.md)

- Learn about [Custom Adapters](./custom-adapters.md)
- Explore [Plugin Development](../guides/plugins.md)
- See [Encapsulation Diagrams](../core-concepts/diagrams/encapsulation.md)
