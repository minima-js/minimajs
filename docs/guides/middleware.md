---
title: Middleware
sidebar_position: 4
tags:
  - middleware
  - plugins
  - composition
---

# Middleware with Plugins

In Minima.js, "middleware" refers to code executed during the request lifecycle, such as before your route handler runs. This is achieved by creating **plugins** that register lifecycle **hooks**. This pattern allows for powerful, reusable, and composable middleware.

Middleware is commonly used for:

- Authentication and authorization
- Logging and metrics
- Request parsing and validation
- Adding data to the context

## Quick Reference

- [`plugin()`](#creating-a-middleware-plugin) - Create a middleware plugin
- [`hook()`](#creating-a-middleware-plugin) - Register lifecycle hooks
- [`compose.create()`](#applying-middleware) - Create middleware applicator
- [Applying middleware](#applying-middleware) - Use middleware with modules

---

## Creating a Middleware Plugin

A middleware is simply a plugin that registers a hook (e.g., `request`, `send`). Let's create a simple logger middleware.

```typescript title="src/plugins/logger.ts"
import { plugin, hook, request } from "@minimajs/server";

// 1. The middleware is a plugin
export const loggerPlugin = plugin((app) => {
  // 2. It registers a hook, in this case 'request'
  app.register(
    hook("request", () => {
      const req = request();
      console.log(`[${req.method}] ${req.url}`);
    })
  );
});
```

This middleware plugin will log the HTTP method and URL of every incoming request it's applied to.

## Applying Middleware

To apply one or more middleware plugins to a module, you use the `compose.create()` function. This creates a reusable "applicator" that wraps your module with the specified plugins.

### Applying to a Module

Let's apply our `loggerPlugin` to a module.

```typescript title="src/index.ts"
import { createApp, compose, type App } from "@minimajs/server";
import { loggerPlugin } from "./plugins/logger";
import { homeModule } from "./home";

const app = createApp();

// 1. Create a middleware applicator
const withLogger = compose.create(loggerPlugin);

// 2. Apply it to your module
const homeModuleWithLogger = withLogger(homeModule);

// 3. Register the wrapped module
app.register(homeModuleWithLogger);

await app.listen({ port: 3000 });
```

Now, every request that hits a route inside `homeModule` will be logged to the console.

## Chaining Middleware

The power of this pattern shines when you chain multiple middleware plugins together. The plugins will be executed in the order they are provided to `compose.create`.

```typescript
import { compose } from "@minimajs/server";
import { loggerPlugin } from "./plugins/logger";
import { authPlugin } from "./plugins/auth"; // Assuming you have an auth plugin

// Creates an applicator that runs auth, then logging
const withAuthAndLogger = compose.create(authPlugin, loggerPlugin);

// Apply to a module
const protectedModule = withAuthAndLogger(adminRoutes);
app.register(protectedModule, { prefix: "/admin" });
```

## Using Express Middleware

While Minima.js has its own powerful middleware system, you can still leverage the rich ecosystem of Express middleware. You can wrap an Express middleware in a plugin.

```typescript
import { plugin, hook } from "@minimajs/server";
import cors from "cors";

// Wrap the cors Express middleware in a Minima.js plugin
export const corsPlugin = plugin((app) => {
  app.register(
    hook("request", (ctx) => {
      // This is a simplified example. A full implementation would need to handle
      // the req, res, and next objects that Express middleware expect.
      // For many cases, it's better to use or create a native Minima.js plugin.
      const corsMiddleware = cors();
      // corsMiddleware(ctx.request, ctx.response, () => {});
    })
  );
});
```

> **Note**: Adapting Express middleware can be complex because they rely on the `(req, res, next)` signature, which is different from Minima.js's context-based approach. For common needs like CORS, it is highly recommended to use a native Minima.js plugin like `@minimajs/cors` or create one.

For more details on creating and composing plugins, refer to the **[Plugins & Composition guide](/core-concepts/plugins)**.
