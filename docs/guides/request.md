---
title: Request
sidebar_position: 4
tags:
  - request
  - params
  - headers
  - body
---

# Request

Request data is globally accessible anywhere from request contexts. The following functions are exposed from `@minimajs/server` for handling HTTP requests.

## request

```typescript
request(): Request
```

Retrieves the HTTP request object.

**Examples:**

```typescript
import { body, request } from "@minimajs/server";

app.get("/", () => {
  const req = request(); // [!code highlight]
  return req.url;
});

app.post("/", () => createUser(body()));
```

You can use request in nested function calls:

```typescript
function getURL() {
  return request().url; // [!code highlight]
}

app.get("/", () => {
  const url = getURL();
  return url;
});
```

### request.url

```typescript
request.url(): URL
```

Retrieves the full request URL.

**Examples:**

```typescript
const url = request.url();
console.log(url.pathname);
console.log(url.searchParams.get("page"));
```

### request.route

```typescript
request.route(): RouteOptions
```

Retrieves the matched route options.

**Examples:**

```typescript
const routeOpts = request.route();
console.log(routeOpts.url);
console.log(routeOpts.method);
```

## request.signal

```typescript
request.signal(): AbortSignal
```

Returns an `AbortSignal` that is triggered when the request is terminated or cancelled. This is useful for cancelling long-running operations like HTTP requests, database queries, or any async task that should stop when the client disconnects.

**Examples:**

```typescript
import { request } from "@minimajs/server";

// Abort fetch requests when client disconnects
app.get("/proxy", async () => {
  const response = await fetch("https://api.example.com/data", {
    signal: request.signal(), // [!code highlight]
  });
  return response.json();
});

// Cancel axios requests
app.get("/external", async () => {
  const response = await axios.get("https://api.example.com/data", {
    signal: request.signal(), // [!code highlight]
  });
  return response.data;
});

// Cancel long-running tasks
app.get("/long-task", async () => {
  const signal = request.signal();

  // Simulate long-running operation
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve({ result: "completed" });
    }, 10000);

    // Cancel if request is aborted
    signal.addEventListener("abort", () => {
      // [!code highlight]
      clearTimeout(timeout); // [!code highlight]
      reject(new Error("Request cancelled")); // [!code highlight]
    }); // [!code highlight]
  });
});
```

**Use Cases:**

- Cancel external API calls when the client disconnects
- Stop database queries that are no longer needed
- Abort file processing or uploads
- Clean up resources for long-running operations

## headers

```typescript
import { headers } from "@minimajs/server";

headers(): Record<string, string | string[]>
```

Retrieves all request headers as an object.

**Examples:**

```typescript
import { headers } from "@minimajs/server";

app.get("/", () => {
  const allHeaders = headers();
  console.log(allHeaders["content-type"]);
  return allHeaders;
});
```

### headers.get

```typescript
headers.get(name: string): string | undefined
headers.get<R>(name: string, transform: (value: string) => R): R | undefined
```

Retrieves a single header value by name with optional transformation.

**Examples:**

```typescript
import { headers } from "@minimajs/server";

app.get("/", () => {
  const auth = headers.get("authorization"); // string | undefined
  const token = headers.get("authorization", (val) => val.split(" ")[1]); // string | undefined
  return { auth, token };
});
```

### headers.getAll

```typescript
headers.getAll(name: string): string[]
headers.getAll<R>(name: string, transform: (value: string) => R): R[]
```

Retrieves all values for a header name with optional transformation.

**Examples:**

```typescript
const cookies = headers.getAll("cookie"); // string[]
const parsed = headers.getAll("cookie", (val) => val.split("=")); // string[][]
```

### headers.set

```typescript
headers.set(name: string, value: string): Response
```

Sets a response header.

**Examples:**

```typescript
headers.set("x-custom-header", "value");
```

## searchParams

```typescript
import { searchParams } from "@minimajs/server";

searchParams<T>(): T
```

Retrieves the search params (query string) from the URL.

**Examples:**

```typescript
import { searchParams } from "@minimajs/server";

app.get("/search", () => {
  const query = searchParams<{ page: string; q: string }>();
  console.log(query.page); // "1"
  console.log(query.q); // "typescript"

  // Or use searchParams.get
  const page = searchParams.get("page");
  return { query, page };
});
```

### searchParams.get

```typescript
searchParams.get(name: string): string | undefined
searchParams.get<R>(name: string, transform: (value: string) => R): R
```

Retrieves a single search param by name with optional transformation.

**Examples:**

```typescript
import { searchParams } from "@minimajs/server";

app.get("/products", () => {
  const page = searchParams.get("page"); // string | undefined
  const pageNum = searchParams.get("page", (val) => parseInt(val)); // number
  return { page, pageNum };
});
```

### searchParams.getAll

```typescript
searchParams.getAll(name: string): string[]
searchParams.getAll<R>(name: string, transform: (value: string) => R): R[]
```

Retrieves all values for a search param by name with optional transformation.

**Examples:**

```typescript
const tags = searchParams.getAll("tag"); // string[]
const tagIds = searchParams.getAll("tag", (val) => parseInt(val)); // number[]
```

## params

```typescript
import { params } from "@minimajs/server";

params<T>(): T
```

Retrieves the route parameters (dynamic segments in the URL path).

**Examples:**

```typescript
import { params } from "@minimajs/server";

app.get("/users/:id/posts/:postId", () => {
  const p = params<{ id: string; postId: string }>();
  console.log(p.id); // "123"
  console.log(p.postId); // "456"

  // Or use params.get
  const id = params.get("id");
  return { userId: p.id, postId: p.postId };
});
```

### params.get

```typescript
params.get(name: string): string
params.get<R>(name: string, transform: (value: string) => R): R
```

Retrieves a single param by name with optional transformation. Throws `NotFoundError` if the param is not found.

**Examples:**

```typescript
import { params } from "@minimajs/server";

app.get("/users/:id", () => {
  const id = params.get("id"); // string
  return { id };
});

app.get("/posts/:page", () => {
  const page = params.get("page", (val) => parseInt(val)); // number
  return { page };
});

app.get("/profiles/:age", () => {
  const age = params.get("age", (val) => {
    const num = parseInt(val);
    if (num < 0) throw new Error("must be positive");
    return num;
  }); // number
  return { age };
});
```

### params.optional

```typescript
params.optional(name: string): string | undefined
params.optional<R>(name: string, transform: (value: string) => R): R | undefined
```

Retrieves a single param by name with optional transformation. Returns `undefined` if the param is not found.

**Examples:**

```typescript
const id = params.optional("id"); // string | undefined
const page = params.optional("page", (val) => parseInt(val)); // number | undefined
```

## body

```typescript
import { body } from "@minimajs/server";

body<T = unknown>(): T
```

Retrieves and parses the request body. Automatically handles JSON, form data, and other content types.

**Examples:**

```typescript
import { body } from "@minimajs/server";

// JSON body
app.post("/users", () => {
  const userData = body<{ name: string; email: string }>();
  console.log(userData.name); // "John Doe"
  console.log(userData.email); // "john@example.com"
  return createUser(userData);
});

// Form data
app.post("/login", () => {
  const credentials = body<{ username: string; password: string }>();
  return authenticate(credentials);
});
```
