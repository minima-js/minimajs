---
title: Testing
sidebar_position: 8
tags:
  - testing
  - unit-tests
  - integration-tests
---

# Testing

Minima.js is built with testability in mind. This guide covers testing strategies for your Minima.js applications using popular testing frameworks.

## Quick Reference

- [Setup](#setup) - Configure your testing environment
- [Unit Testing](#unit-testing) - Test individual handlers and functions
- [Integration Testing](#integration-testing) - Test full request/response cycles
- [Testing Hooks](#testing-hooks) - Test lifecycle hooks
- [Testing Plugins](#testing-plugins) - Test custom plugins
- [Mocking](#mocking) - Mock dependencies and context
- [Best Practices](#best-practices) - Testing recommendations

---

## Setup

### With Bun

Bun includes a built-in test runner:

```bash
bun test
```

**Example test file** (`app.test.ts`):

```ts
import { describe, test, expect } from "bun:test";
import { createApp } from "@minimajs/server/bun";

describe("App", () => {
  test("GET /health returns 200", async () => {
    const app = createApp();
    app.get("/health", () => ({ status: "ok" }));

    const response = await app.inject(new Request("http://localhost/health"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ status: "ok" });
  });
});
```

### With Jest/Vitest

**Install dependencies:**

```bash
npm install --save-dev vitest
# or
npm install --save-dev jest @types/jest
```

**Configure** (`vitest.config.ts`):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

---

## Unit Testing

Test individual handlers in isolation.

### Testing Route Handlers

```ts
import { describe, test, expect } from "bun:test";
import { createApp } from "@minimajs/server/bun";
import { params, body } from "@minimajs/server";

describe("User Routes", () => {
  test("GET /users/:id returns user", async () => {
    const app = createApp();

    app.get("/users/:id", () => {
      const id = params.get("id");
      return { id, name: "Alice" };
    });

    const response = await app.inject(new Request("http://localhost/users/123"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ id: "123", name: "Alice" });
  });

  test("POST /users creates user", async () => {
    const app = createApp();

    app.post("/users", () => {
      const userData = body();
      return { id: "456", ...userData };
    });

    const response = await app.inject(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bob" }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ id: "456", name: "Bob" });
  });
});
```

### Testing with Query Parameters

```ts
test("GET /search with query params", async () => {
  const app = createApp();

  app.get("/search", () => {
    const params = searchParams();
    const query = params.get("q");
    return { results: [], query };
  });

  const response = await app.inject(new Request("http://localhost/search?q=test"));

  const data = await response.json();
  expect(data.query).toBe("test");
});
```

### Testing Headers

```ts
test("requires authorization header", async () => {
  const app = createApp();

  app.get("/protected", () => {
    const auth = headers().get("authorization");
    if (!auth) {
      response.status(401);
      return { error: "Unauthorized" };
    }
    return { data: "secret" };
  });

  // Without auth
  const res1 = await app.inject(new Request("http://localhost/protected"));
  expect(res1.status).toBe(401);

  // With auth
  const res2 = await app.inject(
    new Request("http://localhost/protected", {
      headers: { Authorization: "Bearer token" },
    })
  );
  expect(res2.status).toBe(200);
});
```

---

## Integration Testing

Test the full application with plugins and middleware.

### Testing with Plugins

```ts
import { bodyParser } from "@minimajs/server/plugins";

test("full app with plugins", async () => {
  const app = createApp();

  app.register(bodyParser());

  app.post("/data", () => {
    const data = body();
    return { received: data };
  });

  const response = await app.inject(
    new Request("http://localhost/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: 42 }),
    })
  );

  const result = await response.json();
  expect(result.received).toEqual({ value: 42 });
});
```

### Testing Module Encapsulation

```ts
test("module routes are isolated", async () => {
  const app = createApp();

  const adminModule = app.module("/admin");
  adminModule.get("/users", () => ({ users: [] }));

  const apiModule = app.module("/api");
  apiModule.get("/users", () => ({ data: [] }));

  // Test admin module
  const res1 = await app.inject(new Request("http://localhost/admin/users"));
  const data1 = await res1.json();
  expect(data1).toHaveProperty("users");

  // Test api module
  const res2 = await app.inject(new Request("http://localhost/api/users"));
  const data2 = await res2.json();
  expect(data2).toHaveProperty("data");
});
```

---

## Testing Hooks

### Testing Request Hooks

```ts
test("request hook modifies context", async () => {
  const app = createApp();

  app.register(
    hook("request", () => {
      context.set("requestId", "test-123");
    })
  );

  app.get("/", () => {
    const requestId = context.get("requestId");
    return { requestId };
  });

  const response = await app.inject(new Request("http://localhost/"));
  const data = await response.json();
  expect(data.requestId).toBe("test-123");
});
```

### Testing Transform Hooks

```ts
test("transform hook wraps response", async () => {
  const app = createApp();

  app.register(
    hook("transform", (data) => {
      return { success: true, data };
    })
  );

  app.get("/users", () => [{ id: 1 }]);

  const response = await app.inject(new Request("http://localhost/users"));
  const data = await response.json();
  expect(data).toEqual({
    success: true,
    data: [{ id: 1 }],
  });
});
```

### Testing Send Hooks

```ts
test("send hook adds custom header", async () => {
  const app = createApp();

  app.register(
    hook("send", (response) => {
      return createResponseFromState(response.body, {
        headers: { ...response.headers, "X-Custom": "value" },
      });
    })
  );

  app.get("/", () => "ok");

  const response = await app.inject(new Request("http://localhost/"));
  expect(response.headers.get("X-Custom")).toBe("value");
});
```

---

## Testing Plugins

### Testing Custom Plugins

```ts
import { definePlugin } from "@minimajs/server";

const myPlugin = definePlugin((app, options) => {
  app.register(
    hook("request", () => {
      context.set("pluginData", options.value);
    })
  );
});

test("custom plugin sets context", async () => {
  const app = createApp();

  app.register(myPlugin({ value: "test" }));

  app.get("/", () => {
    return { data: context.get("pluginData") };
  });

  const response = await app.inject(new Request("http://localhost/"));
  const data = await response.json();
  expect(data.data).toBe("test");
});
```

---

## Mocking

### Mocking External Services

```ts
import { mock } from "bun:test";

test("mocked database query", async () => {
  const mockDb = {
    query: mock(() => Promise.resolve([{ id: 1, name: "Alice" }])),
  };

  const app = createApp();

  app.get("/users", async () => {
    const users = await mockDb.query();
    return users;
  });

  const response = await app.inject(new Request("http://localhost/users"));
  const data = await response.json();

  expect(mockDb.query).toHaveBeenCalled();
  expect(data).toHaveLength(1);
});
```

### Mocking Context Values

```ts
test("mock context for testing", async () => {
  const app = createApp();

  // Set up context in request hook
  app.register(
    hook("request", () => {
      context.set("userId", "mock-user-123");
    })
  );

  app.get("/profile", () => {
    const userId = context.get("userId");
    return { userId };
  });

  const response = await app.inject(new Request("http://localhost/profile"));
  const data = await response.json();
  expect(data.userId).toBe("mock-user-123");
});
```

---

## Best Practices

### 1. Test in Isolation

Create a fresh app instance for each test:

```ts
import { beforeEach } from "bun:test";

describe("User API", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    // Setup routes
    app.get("/users", () => []);
  });

  test("test 1", async () => {
    // app is fresh
  });

  test("test 2", async () => {
    // app is fresh again
  });
});
```

### 2. Use Helper Functions

```ts
// test-helpers.ts
export async function makeRequest(app: App, path: string, options?: RequestInit) {
  const response = await app.inject(new Request(`http://localhost${path}`, options));
  const data = await response.json();
  return { response, data };
}

// In tests
test("using helper", async () => {
  const app = createApp();
  app.get("/", () => ({ ok: true }));

  const { response, data } = await makeRequest(app, "/");
  expect(data.ok).toBe(true);
});
```

### 3. Test Error Cases

```ts
test("handles errors gracefully", async () => {
  const app = createApp();

  app.get("/error", () => {
    throw new Error("Something went wrong");
  });

  const response = await app.inject(new Request("http://localhost/error"));
  expect(response.status).toBe(500);
});
```

### 4. Test Edge Cases

```ts
describe("Edge cases", () => {
  test("handles missing parameters", async () => {
    const app = createApp();
    app.get("/users/:id", () => {
      const id = params.get("id");
      if (!id) {
        response.status(400);
        return { error: "ID required" };
      }
      return { id };
    });

    const response = await app.inject(new Request("http://localhost/users/"));
    expect(response.status).toBe(404); // Route doesn't match
  });

  test("handles malformed JSON", async () => {
    const app = createApp();
    app.register(bodyParser());

    app.post("/data", () => {
      try {
        const data = body();
        return data;
      } catch (error) {
        response.status(400);
        return { error: "Invalid JSON" };
      }
    });

    const response = await app.inject(
      new Request("http://localhost/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      })
    );

    expect(response.status).toBe(400);
  });
});
```

### 5. Coverage Goals

Aim for good coverage of:

- ✅ Happy paths (expected inputs)
- ✅ Error paths (invalid inputs, exceptions)
- ✅ Edge cases (boundaries, empty values)
- ✅ Integration points (plugins, hooks)

---

## Related Guides

- [Error Handling](/guides/error-handling) - Testing error scenarios
- [Hooks](/guides/hooks) - Understanding lifecycle hooks
- [Plugins](/core-concepts/plugins) - Creating testable plugins
