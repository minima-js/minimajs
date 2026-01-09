---
title: Http Helpers
sidebar_position: 4
tags:
  - request
  - response
  - context
---

The request and response objects are globally accessible anywhere from request contexts. This section details the helper functions exposed from `@minimajs/server` for interacting with HTTP requests and responses.

## Request

### `request()`

```typescript
request(): Request
```

Retrieves the native Web API `Request` object.

**Examples:**

```ts
import { body, request } from "@minimajs/server";
app.get("/", () => {
  const req = request();
  return req.url;
});
app.post("/", () => createUser(body()));
```

You can also use `request()` in nested function calls:

```ts
function getURL() {
  return request().url;
}
app.get("/", () => {
  const url = getURL();
  return url;
});
```

**Namespace utilities for `request`:**

#### `request.url()`

```ts
request.url(): URL
```

Retrieves the full `URL` object of the incoming request.

**Examples:**

```typescript
const url = request.url();
console.log(url.pathname);
console.log(url.searchParams.get("page"));
```

#### `request.ip()`

```ts
request.ip(): string
```

Retrieves the client IP address from the request. Requires configuration via `request.ip.configure()`.

**Configuration:**

Before using `request.ip()`, you must register the IP configuration plugin:

```typescript
import { request } from "@minimajs/server";

// Basic usage - trust proxy headers
app.register(request.ip.configure({ trustProxy: true }));

// Custom header (e.g., Cloudflare)
app.register(
  request.ip.configure({
    header: "CF-Connecting-IP",
  })
);
```

#### `request.route()`

```ts
request.route(): RouteOptions
```

Retrieves the matched route options.

**Examples:**

```typescript
const routeOpts = request.route();
console.log(routeOpts.url);
console.log(routeOpts.method);
```

### `headers()`

Retrieves the request headers.

**Namespace utilities for `headers`:**

#### `headers.get(name)`

```typescript
headers.get(name: string): string | undefined
headers.get<R>(name: string, transform: (value: string) => R): R | undefined
```

Retrieves a single header value by name with optional transformation.

#### `headers.getAll(name)`

```typescript
headers.getAll(name: string): string[]
headers.getAll<R>(name: string, transform: (value: string) => R): R[]
```

Retrieves all values for a header name with optional transformation.

### `searchParams()`

Retrieves the search parameters (query string).

**Namespace utilities for `searchParams`:**

#### `searchParams.get(name)`

```typescript
searchParams.get(name: string): string | undefined
searchParams.get<R>(name: string, transform: (value: string) => R): R
```

#### `searchParams.getAll(name)`

```typescript
searchParams.getAll(name: string): string[]
searchParams.getAll<R>(name: string, transform: (value: string) => R): R[]
```

### `params()`

Retrieves the request parameters (route parameters).

**Namespace utilities for `params`:**

#### `params.get(name)`

```typescript
params.get(name: string): string
params.get<R>(name: string, transform: (value: string) => R): R
```

#### `params.optional(name)`

```typescript
params.optional(name: string): string | undefined
params.optional<R>(name: string, transform: (value: string) => R): R | undefined
```

### `body()`

```typescript
body<T = unknown>(): T
```

Retrieves the request body.

## Response

Minima.js handlers are highly flexible in how they return responses. You can return raw values, `Response` objects, Promises, Streams, or even Generators.

### Returning Values

Any value returned from a route handler will be automatically serialized into a `Response` object.

```ts
app.get("/", () => {
  return "Hello world"; // Returns a text response
});

app.get("/json", () => {
  return { message: "Hello, JSON!" }; // Returns a JSON response
});
```

### `response()`

```typescript
response(): Response
```

Retrieves the native Web API `Response` object being constructed.

**Namespace utilities for `response`:**

#### `response.status()`

```typescript
response.status(statusCode: keyof typeof StatusCodes | number): Response
```

Sets the HTTP status code for the response.

#### `headers.set(name, value)`

To set response headers, use the `headers.set()` helper function.

```typescript
headers.set(name: string, value: string): void
headers.set(headers: HeadersInit): void
```

## Modifying the Response

You can modify or "decorate" the response before it's sent using lifecycle hooks or by customizing the serialization behavior.

### Custom Serializer (`app.serialize`)

The `app.serialize` function controls how response data is converted to a response body. By default, it serializes objects to JSON and passes through strings and streams as-is.

```ts
import { createApp } from "@minimajs/server";

const app = createApp();

// Custom serialization (e.g., MessagePack, XML, etc.)
app.serialize = (data, ctx) => {
  if (data instanceof ReadableStream) return data;
  if (typeof data === "string") return data;

  // Custom JSON serialization with formatting
  return JSON.stringify(data, null, 2);
};

app.get("/data", () => ({ name: "Alice", age: 30 }));
// Returns formatted JSON with 2-space indentation
```

> **Note:** `app.serialize` is called **after** the `transform` hook and **before** the `send` hook. It's a global serialization strategy for your entire application.

### Modifying Response Data (`transform` hook)

The `transform` hook allows you to modify data returned by a handler before it is serialized into a response.

```ts
import { hook } from "@minimajs/server";

app.register(
  hook("transform", (data) => {
    // Wrap all object responses in a `data` property
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return { data: data };
    }
    return data;
  })
);
```

### Modifying the Final Response (`send` hook)

The `send` hook is executed just before the response is sent, allowing you to modify the final `Response` object, such as adding headers.

```ts
import { hook } from "@minimajs/server";

app.register(
  hook("send", ({ response }) => {
    response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
  })
);
```

## Related Guides

- For details on `defer` (scheduling tasks after response) and other lifecycle hooks, see the [Hooks Guide](/guides/hooks).
- For `abort` (terminating requests with errors) and `redirect` (redirecting clients), see the [Error Handling Guide](/guides/error-handling).
