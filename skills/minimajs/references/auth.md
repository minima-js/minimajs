# @minimajs/auth — Authentication Reference

## createAuth

```typescript
import { createAuth } from "@minimajs/auth";

const [authPlugin, getUser] = createAuth(strategy, options?);
const [authPlugin, getUser] = createAuth([strategy1, strategy2], options?); // multi-strategy OR logic
```

- `strategy` — a strategy (from `bearer`, `apiKey`, `fromHeaders`, etc.) or a raw `async () => T` callback
- `options.required: true` — `getUser()` always returns `T`; throws 401 if auth failed
- Multi-strategy: tries each in order, first to resolve wins; propagates the last `BaseHttpError` if all fail

Returns a `[plugin, resource]` tuple:

- `plugin` — register on the app or in `meta.plugins`
- `getUser()` — returns `T | undefined` (or `T` with `required: true`)
- `getUser.required()` — always returns `T`, throws stored auth error if auth failed

---

## Strategies

### `bearer(callback)`

Extracts a Bearer token from the `Authorization` header. Case-insensitive, trims whitespace.
Throws 401 if the header is missing or not a Bearer scheme.

```typescript
import { createAuth, bearer } from "@minimajs/auth";

const [authPlugin, getUser] = createAuth(bearer(async (token) => {
  const payload = await verifyJWT(token);
  return db.users.findById(payload.sub);
}));
```

### `apiKey(headerName, callback)`

Extracts a value from a custom request header. Throws 401 if the header is missing.

```typescript
const [authPlugin, getUser] = createAuth(apiKey("x-api-key", key => verifyKey(key)));
```

### `apiKey.query(paramName, callback)`

Extracts a value from a query string parameter. Throws 401 if the parameter is missing.
Use for webhooks and public APIs where setting headers isn't practical.

```typescript
const [authPlugin, getUser] = createAuth(apiKey.query("api_key", key => verifyKey(key)));
```

### `fromHeaders(mapping)`

Reads individual gateway-forwarded headers and maps them to an object.
Throws 401 if any mapped header is missing.

```typescript
const [authPlugin, getUser] = createAuth(
  fromHeaders({ id: "x-user-id", role: "x-user-role", email: "x-user-email" })
);
// getUser() → { id: string, role: string, email: string }
```

Prefer `fromHeaders.json` when the gateway encodes the full identity in a single header.

### `fromHeaders.json<T>(headerName)`

Reads a JSON-encoded identity payload from a single gateway header.
Throws 401 if the header is missing **or the value is not valid JSON** — a tampered or malformed
header is treated as an authentication failure, not a server error.

```typescript
const [authPlugin, getUser] = createAuth(fromHeaders.json<User>("x-user"));
// header: x-user: {"id":42,"name":"adil","role":"admin"}
```

### `fromHeaders.encoded<T>(headerName, decode)`

Reads a custom-encoded identity payload from a single gateway header. The `decode` function is
required — use this for base64, msgpack, protobuf, or any non-JSON encoding.
Throws 401 if the header is missing **or the decode function throws**.

```typescript
// base64+JSON (e.g. nginx auth_request, some gateways)
createAuth(fromHeaders.encoded<User>("x-user", val => JSON.parse(atob(val))))

// msgpack+base64
createAuth(fromHeaders.encoded<User>("x-user", val => msgpack.decode(atob(val))))
```

---

## Multi-strategy

Accepts an array of strategies with OR logic — the first to resolve without throwing wins.
Use when a service needs to accept more than one credential type.

```typescript
// JWT or API key
const [authPlugin, getUser] = createAuth([
  bearer(token => verifyJWT(token)),
  apiKey("x-api-key", key => verifyKey(key)),
]);

// Direct call or behind gateway (common in microservices)
const [authPlugin, getUser] = createAuth([
  bearer(token => verifyJWT(token)),
  fromHeaders.json<User>("x-user"),
]);
```

**Error behavior:**
- If all strategies fail with `BaseHttpError`, the last error is stored and thrown when `getUser.required()` is called
- If any strategy throws a non-`BaseHttpError` (e.g. a database error), it propagates immediately — remaining strategies are not tried and the request fails with 500

---

## Optional vs required auth

```typescript
// optional — getUser() returns User | undefined
const [authPlugin, getUser] = createAuth(bearer(token => verifyJWT(token)));
const user = getUser();           // User | undefined
const user = getUser.required();  // User — throws 401 if not authed

// required — getUser() always returns User
const [authPlugin, getUser] = createAuth(bearer(token => verifyJWT(token)), { required: true });
const user = getUser(); // User — throws 401 if auth failed
```

---

## Error behavior reference

| Situation | Result |
|-----------|--------|
| Missing header / param | 401 `UnauthorizedError` |
| Wrong scheme (`Basic` instead of `Bearer`) | 401 `UnauthorizedError` |
| Malformed JSON in `fromHeaders.json` | 401 `UnauthorizedError` |
| Decode throws in `fromHeaders.encoded` | 401 `UnauthorizedError` |
| Callback throws `BaseHttpError` | stored, thrown at `getUser.required()` |
| Callback throws non-`BaseHttpError` | propagates immediately → 500 |

---

## Recommended structure

```typescript
// src/auth.ts
import { createAuth, bearer } from "@minimajs/auth";

export const [authPlugin, getUser] = createAuth(bearer(async (token) => {
  const payload = await verifyJWT(token);
  return db.users.findById(payload.sub);
}));
```

```typescript
// src/module.ts — register globally so getUser is available everywhere
import { authPlugin } from "./auth.js";
export const meta: Meta = { plugins: [authPlugin] };
```

```typescript
// src/admin/module.ts — enforce auth on specific routes
import { getUser } from "../auth.js";
import { ForbiddenError } from "@minimajs/auth";

export const routes: Routes = {
  "GET /dashboard": () => {
    const user = getUser.required();
    if (!user.isAdmin) throw new ForbiddenError();
    return getDashboardData();
  },
};
```

---

## Microservice pattern

For services behind an API gateway, the gateway verifies the token and forwards the identity —
no re-verification needed in the service.

```typescript
// single JSON header (recommended — scales as user object grows)
export const [authPlugin, getUser] = createAuth(fromHeaders.json<User>("x-user"));

// individual headers (for simple flat identity or infrastructure-level fields)
export const [authPlugin, getUser] = createAuth(
  fromHeaders({ id: "x-user-id", role: "x-user-role" })
);

// accepts both direct JWT and gateway-forwarded identity
export const [authPlugin, getUser] = createAuth([
  bearer(token => verifyJWT(token)),
  fromHeaders.json<User>("x-user"),
]);
```

---

## Error classes

```typescript
import { UnauthorizedError, ForbiddenError } from "@minimajs/auth";

throw new UnauthorizedError();                // 401
throw new UnauthorizedError("Token expired"); // 401 with message

throw new ForbiddenError();                   // 403
throw new ForbiddenError("Insufficient role"); // 403 with message
```

Both extend `HttpError` — their JSON shape can be overridden via `HttpError.toJSON`.

---

## Role-based access pattern

```typescript
// src/auth/guards.ts
import { getUser } from "./auth.js";
import { ForbiddenError } from "@minimajs/auth";
import { hook } from "@minimajs/server";

export function requireRole(...roles: string[]) {
  return hook("request", () => {
    const user = getUser.required();
    if (!roles.some(r => user.roles.includes(r))) throw new ForbiddenError();
  });
}

// src/admin/module.ts
export const meta: Meta = {
  plugins: [requireRole("admin")],
};
```
