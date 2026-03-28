# @minimajs/auth — Authentication Reference

## createAuth

```typescript
import { createAuth } from "@minimajs/auth";
import { UnauthorizedError, ForbiddenError } from "@minimajs/auth";

const [authPlugin, getUser] = createAuth(callback, options?);
```

- `callback` — async function that authenticates the request and returns user data, or throws a `BaseHttpError`
- `options.required: true` — make all routes under this plugin require auth automatically

Returns a `[plugin, resource]` tuple:
- `plugin` — register on the app or in `meta.plugins`
- `getUser()` — call inside handlers to get the authenticated user

## Optional auth (default)

```typescript
const [authPlugin, getUser] = createAuth(async () => {
  const token = headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return undefined; // or throw UnauthorizedError
  return await verifyToken(token); // return user
});

// In handler:
const user = getUser();           // User | undefined
const user = getUser.required();  // User — throws UnauthorizedError if not authed
```

## Required auth

All routes under this plugin are protected automatically:

```typescript
const [authPlugin, getUser] = createAuth(
  async () => {
    const token = headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedError();
    return await verifyToken(token);
  },
  { required: true }
);

// In handler:
const user = getUser(); // always returns User — throws 401 if auth failed
```

## Recommended structure

```typescript
// src/auth/context.ts
import { createAuth } from "@minimajs/auth";
import { UnauthorizedError } from "@minimajs/auth";
import { headers } from "@minimajs/server";

export const [authPlugin, getUser] = createAuth(async () => {
  const token = headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new UnauthorizedError();
  const payload = await verifyJWT(token);
  return await db.users.findById(payload.sub);
});
```

```typescript
// src/module.ts — register globally so getUser is available everywhere
import { authPlugin } from "./auth/context.js";
export const meta: Meta = { plugins: [authPlugin] };
```

```typescript
// src/admin/module.ts — enforce auth on specific routes
import { getUser } from "../auth/context.js";
export const routes: Routes = {
  "GET /dashboard": () => {
    const user = getUser.required();
    if (!user.isAdmin) throw new ForbiddenError();
    return getDashboardData();
  },
};
```

## Error classes

```typescript
import { UnauthorizedError, ForbiddenError } from "@minimajs/auth";

throw new UnauthorizedError();                    // 401
throw new UnauthorizedError("Token expired");     // 401 with message

throw new ForbiddenError();                       // 403
throw new ForbiddenError("Insufficient role");    // 403 with message
```

Both extend `HttpError` — their JSON shape can be overridden via `HttpError.toJSON`.

## Role-based access pattern

```typescript
// auth/guards.ts
import { getUser } from "./context.js";
import { ForbiddenError } from "@minimajs/auth";

export function requireRole(role: string) {
  return plugin.sync((app) => {
    app.register(hook("request", () => {
      const user = getUser.required();
      if (!user.roles.includes(role)) throw new ForbiddenError();
    }));
  });
}

// Usage in meta.plugins or as a descriptor:
export const meta: Meta = {
  plugins: [requireRole("admin")],
};
```
