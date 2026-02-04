---
title: Route Descriptors
sidebar_position: 8
tags:
  - routes
  - metadata
  - descriptors
  - openapi
---

# Route Descriptors

Route descriptors allow you to attach metadata to routes. This metadata can be used by plugins like OpenAPI for documentation generation, authentication requirements, rate limiting, or any custom route-level configuration.

## What is a Route Descriptor?

A route descriptor is either:

1. **A tuple** `[symbol, value]` - sets a specific metadata entry
2. **A function** `(route) => void` - receives the route config for dynamic modifications

```typescript
import type { RouteMetaDescriptor } from "@minimajs/server";

// Tuple form - simple key-value pair
const myDescriptor: RouteMetaDescriptor = [mySymbol, "value"];

// Function form - access to full route config
const dynamicDescriptor: RouteMetaDescriptor = (route) => {
  route.metadata[mySymbol] = route.path;
};
```

## The `RouteMetaDescriptor` Type

The type definition:

```typescript
type RouteMetaDescriptor<S = unknown> =
  | [symbol: symbol, value: unknown]
  | ((config: RouteConfig<S>) => void);
```

The `RouteConfig` provides access to:

```typescript
interface RouteConfig<S> {
  methods: HTTPMethod[];   // HTTP methods (GET, POST, etc.)
  path: string;            // Route path pattern
  handler: Handler<S>;     // Route handler function
  metadata: RouteMetadata; // Metadata object to modify
  app: App<S>;             // Application instance
}
```

## Using Descriptors on Routes

Descriptors are passed between the path and handler in route definitions:

```typescript
import { createApp } from "@minimajs/server/bun";

const app = createApp();

// Single descriptor
app.get("/users", myDescriptor, () => {
  return getUsers();
});

// Multiple descriptors - applied in order
app.post("/users", descriptor1, descriptor2, descriptor3, () => {
  return createUser();
});
```

## Creating Custom Descriptors

### Simple Tuple Descriptors

For static metadata, use helper functions that return tuples:

```typescript
// descriptors/auth.ts
import type { RouteMetaDescriptor } from "@minimajs/server";

export const kAuthRequired = Symbol("auth.required");
export const kAuthRoles = Symbol("auth.roles");
export const kRateLimit = Symbol("rateLimit");

// Simple boolean flag
export function requireAuth(): RouteMetaDescriptor {
  return [kAuthRequired, true];
}

// With parameters
export function requireRoles(...roles: string[]): RouteMetaDescriptor {
  return [kAuthRoles, roles];
}

// With configuration object
export function rateLimit(config: { max: number; window: string }): RouteMetaDescriptor {
  return [kRateLimit, config];
}
```

Usage:

```typescript
import { requireAuth, requireRoles, rateLimit } from "./descriptors/auth.js";

// Single descriptor
app.get("/profile", requireAuth(), () => getProfile());

// Multiple descriptors
app.delete("/users/:id",
  requireAuth(),
  requireRoles("admin"),
  rateLimit({ max: 10, window: "1m" }),
  () => deleteUser()
);
```

### Dynamic Function Descriptors

For metadata that depends on route properties:

```typescript
import type { RouteMetaDescriptor } from "@minimajs/server";

const kOperationId = Symbol("operationId");
const kAuditLog = Symbol("auditLog");

// Generate operationId from route info
export function autoOperationId(): RouteMetaDescriptor {
  return (route) => {
    const method = route.methods[0].toLowerCase();
    const path = route.path.replace(/[/:]/g, "_").replace(/^_/, "");
    route.metadata[kOperationId] = `${method}_${path}`;
  };
}

// Conditional metadata based on HTTP method
export function auditMutations(): RouteMetaDescriptor {
  return (route) => {
    const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (route.methods.some(m => mutationMethods.includes(m))) {
      route.metadata[kAuditLog] = true;
    }
  };
}
```

### Composing Descriptors

Create higher-level descriptors from multiple lower-level ones:

```typescript
import type { RouteMetaDescriptor } from "@minimajs/server";
import { requireAuth, requireRoles, rateLimit } from "./auth.js";
import { describe } from "@minimajs/openapi";

// Combine multiple descriptors for admin routes
export function adminRoute(summary: string): RouteMetaDescriptor[] {
  return [
    requireAuth(),
    requireRoles("admin"),
    rateLimit({ max: 100, window: "1m" }),
    describe({ summary, tags: ["Admin"] }),
  ];
}

// Usage with spread
app.get("/admin/users", ...adminRoute("List admin users"), () => {
  return getAdminUsers();
});
```

## Reading Route Metadata

Access route metadata in hooks to implement cross-cutting concerns:

### In Request Hooks

```typescript
import { hook, abort } from "@minimajs/server";
import { kAuthRequired, kAuthRoles } from "./descriptors/auth.js";

app.register(
  hook("request", async (ctx) => {
    const metadata = ctx.route?.store.metadata;
    if (!metadata) return;

    // Check authentication requirement
    if (metadata[kAuthRequired]) {
      const token = ctx.request.headers.get("authorization");
      if (!token) {
        abort({ error: "Unauthorized" }, 401);
      }
      // Verify token...
    }

    // Check role requirements
    const requiredRoles = metadata[kAuthRoles] as string[] | undefined;
    if (requiredRoles?.length) {
      const userRoles = getUserRoles(); // From verified token
      const hasRole = requiredRoles.some(r => userRoles.includes(r));
      if (!hasRole) {
        abort({ error: "Forbidden" }, 403);
      }
    }
  })
);
```

### In Send Hooks

```typescript
import { hook } from "@minimajs/server";

const kCacheControl = Symbol("cacheControl");

app.register(
  hook("send", (response, ctx) => {
    const cacheControl = ctx.route?.store.metadata[kCacheControl] as string | undefined;
    if (cacheControl) {
      response.headers.set("Cache-Control", cacheControl);
    }
    return response;
  })
);
```

### Building Plugins from Metadata

Create reusable plugins that act on metadata:

```typescript
import { plugin, hook, abort } from "@minimajs/server";
import { kRateLimit } from "./symbols.js";

interface RateLimitConfig {
  max: number;
  window: string;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimitPlugin = plugin(async (app) => {
  app.register(
    hook("request", (ctx) => {
      const config = ctx.route?.store.metadata[kRateLimit] as RateLimitConfig | undefined;
      if (!config) return;

      const key = `${ctx.request.ip}:${ctx.pathname}`;
      const now = Date.now();
      const entry = rateLimitStore.get(key);

      if (entry && entry.resetAt > now) {
        if (entry.count >= config.max) {
          abort({ error: "Rate limit exceeded" }, 429);
        }
        entry.count++;
      } else {
        rateLimitStore.set(key, {
          count: 1,
          resetAt: now + parseWindow(config.window)
        });
      }
    })
  );
});
```

## Module-Level Descriptors

Use the `descriptor()` plugin to apply metadata to all routes in a module:

```typescript
import { descriptor } from "@minimajs/server/plugins";

export const meta = {
  plugins: [
    descriptor(
      requireAuth(),
      rateLimit({ max: 100, window: "1m" })
    ),
  ],
};

export default async function (app) {
  // All routes inherit the descriptors
  app.get("/data", () => getData());
  app.post("/data", () => createData());
}
```

> For detailed documentation on the `descriptor()` plugin, see [Plugins - Descriptor](/core-concepts/plugins#route-metadata-with-descriptor).

## OpenAPI Integration

The `@minimajs/openapi` package provides built-in descriptors:

### `describe()` - Operation Metadata

```typescript
import { describe } from "@minimajs/openapi";

app.get("/users", describe({
  summary: "List all users",
  description: "Returns a paginated list of all users.",
  tags: ["Users"],
  operationId: "listUsers",
  deprecated: false,
  security: [{ bearerAuth: [] }],
}), () => getUsers());
```

### `internal()` - Exclude from OpenAPI

```typescript
import { internal } from "@minimajs/openapi";

// Won't appear in OpenAPI documentation
app.get("/health", internal(), () => "ok");
app.get("/metrics", internal(), () => getMetrics());
```

### Combining with Schema

```typescript
import { schema, createBody, createResponse } from "@minimajs/schema";
import { describe } from "@minimajs/openapi";
import { z } from "zod";

const CreateUser = createBody(
  z.object({
    name: z.string(),
    email: z.string().email(),
  })
);

const UserResponse = createResponse(201, z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
}));

app.post(
  "/users",
  describe({ summary: "Create user", tags: ["Users"] }),
  schema(CreateUser, UserResponse),
  () => {
    const body = CreateUser();
    return UserResponse({ id: "123", ...body });
  }
);
```

## Best Practices

1. **Use symbols for keys** - Prevents naming collisions between packages
   ```typescript
   // Good - unique symbol
   export const kAuth = Symbol("myapp.auth");

   // Avoid - string keys can collide
   metadata["auth"] = true;
   ```

2. **Create helper functions** - More readable than raw tuples
   ```typescript
   // Good
   app.get("/admin", requireAuth(), requireRoles("admin"), handler);

   // Less readable
   app.get("/admin", [kAuth, true], [kRoles, ["admin"]], handler);
   ```

3. **Export symbols for consumers** - Allow other code to read your metadata
   ```typescript
   // auth.ts
   export const kAuthRequired = Symbol("auth.required");
   export function requireAuth(): RouteMetaDescriptor {
     return [kAuthRequired, true];
   }
   ```

4. **Keep descriptors focused** - Single responsibility per descriptor
   ```typescript
   // Good - separate concerns
   app.get("/data", requireAuth(), rateLimit(100), cacheFor("1h"), handler);

   // Avoid - mixing concerns
   app.get("/data", authAndRateLimitAndCache(), handler);
   ```

5. **Use module-level for common metadata** - Route-level for exceptions
   ```typescript
   export const meta = {
     plugins: [descriptor(requireAuth())], // Default: auth required
   };

   export default async function (app) {
     app.get("/public", [kPublic, true], handler); // Exception: public
     app.get("/private", handler); // Uses module default
   }
   ```

## See Also

- [Plugins - Descriptor](/core-concepts/plugins#route-metadata-with-descriptor)
- [Hooks](/guides/hooks)
- [OpenAPI Generation](/packages/openapi)
- [Schema Validation](/packages/schema)
