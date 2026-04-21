# Descriptor

The Descriptor plugin applies route metadata to all routes within its scope. Use it to tag entire modules with common metadata like authentication requirements, rate limits, or OpenAPI documentation.

## Usage

::: code-group

```typescript [src/users/module.ts]
import { descriptor } from "@minimajs/server/plugins";
import type { Meta, Routes } from "@minimajs/server";

const kAuth = Symbol("auth");

export const meta: Meta = {
  plugins: [descriptor([kAuth, "required"])],
};

function getUsers() {
  /* ... */
}
function createUser() {
  /* ... */
}

export const routes: Routes = {
  "GET /": getUsers, // Has kAuth metadata
  "POST /": createUser, // Has kAuth metadata
};
```

:::

## Multiple Descriptors

Pass multiple descriptors at once to your module's `meta.plugins`:

::: code-group

```typescript [src/api/module.ts]
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";
import type { Meta } from "@minimajs/server";

const kAuth = Symbol("auth");
const kRateLimit = Symbol("rateLimit");

export const meta: Meta = {
  plugins: [descriptor([kAuth, "required"], [kRateLimit, { max: 100, window: "1m" }], describe({ tags: ["Users"] }))],
};
```

:::

## Scoping

Like all plugins, `descriptor()` respects module boundaries and prefix inheritance:

::: code-group

```typescript [src/module.ts]
import { descriptor } from "@minimajs/server/plugins";
import type { Meta } from "@minimajs/server";

const kPublicApi = Symbol("publicApi");

// Root module
export const meta: Meta = {
  plugins: [descriptor([kPublicApi, true])],
};
```

```typescript [src/admin/module.ts]
import { descriptor } from "@minimajs/server/plugins";
import type { Meta } from "@minimajs/server";

const kAdminOnly = Symbol("adminOnly");

// Child module
export const meta: Meta = {
  plugins: [descriptor([kAdminOnly, true])],
};
// Routes here inherit BOTH kPublicApi and kAdminOnly
```

:::

## Dynamic Descriptors

Use a function for metadata based on route properties:

::: code-group

```typescript [src/module.ts]
import { descriptor } from "@minimajs/server/plugins";
import type { Meta } from "@minimajs/server";

const kOperationId = Symbol("operationId");

export const meta: Meta = {
  plugins: [
    descriptor((route) => {
      const method = route.methods[0].toLowerCase();
      const path = route.path.replace(/[/:]/g, "_");
      route.metadata[kOperationId] = `${method}${path}`;
    }),
  ],
};
```

:::

## See Also

- [Route Descriptors Guide](/guides/route-descriptors) - Creating custom descriptors, reading metadata
- [OpenAPI](/packages/openapi) - Built-in `describe()` and `internal()` descriptors
