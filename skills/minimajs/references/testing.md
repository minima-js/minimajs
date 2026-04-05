# Testing minimajs apps

## Core approach

Use `app.handle(request)` to test routes without starting a real server. It returns a native `Response`.

```typescript
import { createApp } from "@minimajs/server/node"; // or /bun
import { createRequest } from "@minimajs/server/mock";

const app = createApp({ moduleDiscovery: false });
app.get("/users/:id", () => {
  const id = params.get("id");
  return { id };
});

await app.ready();

const res = await app.handle(createRequest("/users/123"));
const data = await res.json();
// { id: "123" }
```

Always use `moduleDiscovery: false` in tests to avoid file discovery.

## createRequest

```typescript
import { createRequest } from "@minimajs/server/mock";

// GET request
createRequest("/users");

// With method
createRequest("/users", { method: "POST" });

// With JSON body (auto-sets Content-Type: application/json)
createRequest("/users", {
  method: "POST",
  body: { name: "Alice", email: "alice@example.com" },
});

// With query string
createRequest("/users", { query: { page: "1", limit: "10" } });
// equivalent to: createRequest("/users?page=1&limit=10")

// With headers
createRequest("/users", {
  headers: { authorization: "Bearer token123" },
});

// Or use native Request directly
new Request("http://localhost/users/123");
new Request("http://localhost/users", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Alice" }),
});
```

## Testing patterns

### Test setup with shared app

```typescript
// test/setup.ts
import { createApp } from "@minimajs/server/node";
import { params } from "@minimajs/server";

export function buildApp() {
  const app = createApp({ moduleDiscovery: false });
  // Register routes programmatically, or import route handlers
  return app;
}
```

### Asserting responses

```typescript
const res = await app.handle(
  createRequest("/users", {
    method: "POST",
    body: { name: "Alice" },
  })
);

expect(res.status).toBe(201);
const body = await res.json();
expect(body.name).toBe("Alice");
expect(body.id).toBeDefined();
```

### Testing errors

```typescript
const res = await app.handle(createRequest("/users/nonexistent-uuid"));
expect(res.status).toBe(404);
```

### Testing with auth

```typescript
const res = await app.handle(
  createRequest("/profile", {
    headers: { authorization: "Bearer valid-jwt-token" },
  })
);
expect(res.status).toBe(200);

// Test unauthorized
const unauthed = await app.handle(createRequest("/profile"));
expect(unauthed.status).toBe(401);
```

### Mocking context (inject values into AsyncLocalStorage)

```typescript
import { createContext } from "@minimajs/server/mock";

// Inject a pre-set context value for testing context-dependent code
const cleanup = createContext({ userId: "test-user-123" });
try {
  const result = await someContextDependentFunction();
  expect(result).toBeDefined();
} finally {
  cleanup();
}
```

### Testing file uploads (multipart)

```typescript
const formData = new FormData();
formData.append("name", "Alice");
formData.append("avatar", new File(["image bytes"], "avatar.jpg", { type: "image/jpeg" }));

const res = await app.handle(
  new Request("http://localhost/upload", {
    method: "POST",
    body: formData,
  })
);
expect(res.status).toBe(200);
```

## Lifecycle in tests

```typescript
// If your app registers lifecycle hooks (db connections, etc.)
// always call ready() and close() around tests
beforeAll(() => app.ready());
afterAll(() => app.close());
```

## Testing with Bun's test runner

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApp } from "@minimajs/server/bun";
import { createRequest } from "@minimajs/server/mock";

describe("Users API", () => {
  const app = createApp({ moduleDiscovery: false });
  app.get("/users/:id", () => ({ id: params.get("id") }));

  beforeAll(() => app.ready());
  afterAll(() => app.close());

  it("returns user by id", async () => {
    const res = await app.handle(createRequest("/users/abc123"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "abc123" });
  });
});
```
