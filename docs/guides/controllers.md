# Controllers

Type-safe route registration by mapping HTTP methods and paths to controller functions.

## Basic Usage

```typescript
// src/users/controller.ts
import { body, params } from "@minimajs/server";

export async function getList() {
  return { users: [] };
}

export async function createUser() {
  const user = body<{ name: string }>();
  return { created: user };
}

export async function getUser() {
  const id = params.get("id");
  return { user: { id } };
}
```

```typescript
// src/users/module.ts
import type { Meta } from "@minimajs/server";
import { controller } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    controller(import("./controller"), [
      // Format: "<METHOD> <PATH> <HANDLER_NAME>"
      "GET / getList",
      "POST / createUser",
      "GET /:id getUser",
    ]),
  ],
};
```

## Route Format

```
<METHOD> <PATH> <HANDLER_NAME>
```

- `"GET / getList"` → `GET /` calls `getList`
- `"POST / createUser"` → `POST /` calls `createUser`
- `"GET /:id getUser"` → `GET /:id` calls `getUser`

## Type Safety

TypeScript ensures handler names match exported functions:

```typescript
// ✅ Valid
controller(import("./controller"), ["GET / getList"]);

// ❌ Type error - handler doesn't exist
controller(import("./controller"), ["GET / missingHandler"]);
```

## REST Helper

For standard CRUD operations:

```typescript
// src/posts/module.ts
import { controller } from "@minimajs/server";

export const meta: Meta = {
  plugins: [controller.rest(import("./controller"), "id")],
};
```

Automatically creates:

- `GET /` → `list`
- `GET /:id` → `find`
- `POST /` → `create`
- `PATCH /:id` → `update`
- `DELETE /:id` → `remove`

Missing handlers are automatically skipped.
