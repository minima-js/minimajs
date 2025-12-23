---
title: Route Logger
---

# Route Logger Plugin

**Overview**

The `routeLogger` plugin displays all registered routes in your application when the server starts. This is useful for debugging, development, and understanding your application's route structure at a glance.

## Basic Usage

```typescript
import { createApp } from "@minimajs/server";
import { routeLogger } from "@minimajs/server/plugins";

const app = createApp();

// Register the route logger plugin
app.register(routeLogger());

// Define your routes
app.get("/users", () => ({ users: [] }));
app.post("/users", () => ({ created: true }));
app.get("/users/:id", () => ({ user: {} }));

app.listen({ port: 3000 });
```

**Output:**
```
└── /
    └── users (GET)
        ├── / (POST)
        └── /:id (GET)
```

## Configuration Options

### Custom Logger

Replace the default console output with your own logging function:

```typescript
import { routeLogger } from "@minimajs/server/plugins";

app.register(routeLogger({
  logger: (routes) => {
    // Log to a file
    fs.appendFileSync("routes.log", routes);

    // Or use your custom logger
    myLogger.info("Application routes:", routes);
  }
}));
```

### Common Prefix

When all your routes share a common prefix, you can remove it for cleaner output:

```typescript
app.register(routeLogger({
  commonPrefix: true
}));
```

**Example:**

Without `commonPrefix`:
```
└── /api/v1
    └── users (GET)
    └── posts (GET)
```

With `commonPrefix: true`:
```
└── /
    └── users (GET)
    └── posts (GET)
```

## Practical Examples

### Development vs Production

Only log routes in development:

```typescript
import { routeLogger } from "@minimajs/server/plugins";

const app = createApp();

if (process.env.NODE_ENV === "development") {
  app.register(routeLogger());
}
```

### Custom Formatting

Create a custom formatted output:

```typescript
app.register(routeLogger({
  logger: (routes) => {
    console.log("\n=== Application Routes ===");
    console.log(routes);
    console.log("=========================\n");
  }
}));
```

### Logging with Timestamps

Add timestamps to route logs:

```typescript
app.register(routeLogger({
  logger: (routes) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Routes registered:`);
    console.log(routes);
  }
}));
```

## How It Works

The `routeLogger` plugin:

1. Registers an `onReady` hook with Fastify
2. When the server is ready, calls `app.printRoutes()` to get the route tree
3. Passes the formatted route tree to the logger function
4. By default, outputs to console with magenta color using `chalk`

## When to Use

**Good use cases:**
- ✅ Development and debugging
- ✅ Documenting API endpoints
- ✅ Verifying route registration
- ✅ Startup diagnostics

**Avoid in:**
- ❌ Production (unless logging to files/monitoring)
- ❌ High-security environments (may expose internal structure)

## Integration with Other Plugins

The route logger works well alongside other plugins:

```typescript
import { createApp } from "@minimajs/server";
import { routeLogger, gracefulShutdown } from "@minimajs/server/plugins";

const app = createApp();

// Register multiple plugins
app.register(routeLogger());
app.register(gracefulShutdown());

// Your routes
app.get("/health", () => ({ status: "ok" }));

app.listen({ port: 3000 });
```

## Best Practices

1. **Conditional Registration:** Only enable in development or staging
2. **Custom Loggers:** Use structured logging in production environments
3. **Placement:** Register before defining routes to capture all routes
4. **Common Prefix:** Enable for cleaner output when using versioned APIs

## Additional Resources

- [Fastify Routes Documentation](https://fastify.dev/docs/latest/Reference/Routes/)
- [Fastify printRoutes Method](https://fastify.dev/docs/latest/Reference/Server/#printroutes)
