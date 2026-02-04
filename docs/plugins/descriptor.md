# Descriptor

The Descriptor plugin applies route metadata to all routes within its scope. Use it to tag entire modules with common metadata like authentication requirements, rate limits, or OpenAPI documentation.

## Usage

```typescript
import { descriptor } from "@minimajs/server/plugins";

const kAuth = Symbol("auth");

export const meta = {
  plugins: [
    descriptor([kAuth, "required"]),
  ],
};

export default async function (app) {
  app.get("/users", () => getUsers());   // Has kAuth metadata
  app.post("/users", () => createUser()); // Has kAuth metadata
}
```

## Multiple Descriptors

Pass multiple descriptors at once:

```typescript
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";

const kAuth = Symbol("auth");
const kRateLimit = Symbol("rateLimit");

export const meta = {
  plugins: [
    descriptor(
      [kAuth, "required"],
      [kRateLimit, { max: 100, window: "1m" }],
      describe({ tags: ["Users"] })
    ),
  ],
};
```

## Scoping

Like all plugins, `descriptor()` respects module boundaries:

```typescript
// src/module.ts - Root module
export const meta = {
  plugins: [descriptor([kPublicApi, true])],
};

// src/admin/module.ts - Child module
export const meta = {
  plugins: [descriptor([kAdminOnly, true])],
};
// Routes here inherit BOTH kPublicApi and kAdminOnly
```

## Dynamic Descriptors

Use a function for metadata based on route properties:

```typescript
const kOperationId = Symbol("operationId");

export const meta = {
  plugins: [
    descriptor((route) => {
      const method = route.methods[0].toLowerCase();
      const path = route.path.replace(/[/:]/g, "_");
      route.metadata[kOperationId] = `${method}${path}`;
    }),
  ],
};
```

## See Also

- [Route Descriptors Guide](/guides/route-descriptors) - Creating custom descriptors, reading metadata
- [OpenAPI](/packages/openapi) - Built-in `describe()` and `internal()` descriptors
