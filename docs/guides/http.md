---
title: Http Helpers
sidebar_position: 4
tags:
  - request
  - response
  - context
---

# HTTP Helpers

The request and response objects are globally accessible anywhere from request contexts. This guide covers helper functions for interacting with HTTP requests and responses.

## Quick Reference

### Request Helpers

- [`request()`](#request) - Get native Request object
- [`request.url()`](#requesturl) - Get URL object
- [`request.ip()`](#requestip) - Get client IP address
- [`request.route()`](#requestroute) - Get matched route options
- [`headers()`](#headers) - Get request headers
- [`searchParams()`](#searchparams) - Get query string parameters
- [`params()`](#params) - Get route parameters
- [`body()`](#body) - Get request body

### Response Helpers

- [`response()`](#response-1) - Get native Response object
- [`response.status()`](#responsestatus) - Set status code
- [`headers.set()`](#headersset) - Set response headers

### Customization

- [`app.serialize`](#custom-serializer-appserialize) - Global serialization
- [`transform` hook](#modifying-response-data-transform-hook) - Modify data before serialization
- [`send` hook](#modifying-the-final-response-send-hook) - Modify response before sending

---

## Request

### `request()`

Retrieves the native Web API `Request` object.

```ts
import { request } from "@minimajs/server";

app.get("/", () => {
  const req = request();
  return req.url;
});
```

You can use `request()` in nested function calls:

```ts
function getURL() {
  return request().url;
}

app.get("/", () => getURL());
```

### `request.url()`

Returns the parsed URL object from the request.

```ts
import { request } from "@minimajs/server";

app.get("/users", () => {
  const url = request.url();
  console.log(url.pathname); // "/users"
  console.log(url.searchParams.get("page")); // query param
  return { path: url.pathname };
});
```

### `request.ip()`

Returns the client's IP address. Requires configuration via `request.ip.configure()`.

**Configuration:**

Before using `request.ip()`, configure the IP plugin:

```ts
import { request } from "@minimajs/server";

// Trust proxy headers
app.register(request.ip.configure({ trustProxy: true }));

// Use custom header (e.g., Cloudflare)
app.register(request.ip.configure({ header: "CF-Connecting-IP" }));
```

**Example:**

```ts
app.get("/", () => {
  const ip = request.ip();
  return { clientIp: ip };
});
```

### `request.route()`

Returns the matched route options for the current request.

```ts
import { request } from "@minimajs/server";

app.get(
  "/admin",
  () => {
    const route = request.route();
    console.log(route.url); // "/admin"
    console.log(route.method); // "GET"
    return "Admin panel";
  },
  { name: "admin-panel" }
);
```

## Headers

### `headers()`

Returns the request headers. Supports direct access and transformation utilities.

```ts
import { headers } from "@minimajs/server";

app.get("/", () => {
  const reqHeaders = headers();
  const auth = reqHeaders.get("authorization");
  return { auth };
});
```

### `headers.get()`

Gets a single header value with optional transformation.

```ts
import { headers } from "@minimajs/server";

// Get as string
const contentType = headers.get("content-type");

// Transform to number
const contentLength = headers.get("content-length", Number);
```

### `headers.getAll()`

Gets all values for a header with optional transformation.

```ts
import { headers } from "@minimajs/server";

// Get all values
const cookies = headers.getAll("cookie");

// Transform each value
const lengths = headers.getAll("x-custom", Number);
```

## Search Params

### `searchParams()`

Returns the URL search parameters (query string).

```ts
import { searchParams } from "@minimajs/server";

app.get("/search", () => {
  const params = searchParams();
  const query = params.get("q");
  return { query };
});
```

### `searchParams.get()`

Gets a single query parameter with optional transformation.

```ts
import { searchParams } from "@minimajs/server";

// Get as string
const query = searchParams.get("q");

// Transform to number
const page = searchParams.get("page", Number);
```

### `searchParams.getAll()`

Gets all values for a query parameter with optional transformation.

```ts
import { searchParams } from "@minimajs/server";

// Get all values
const tags = searchParams.getAll("tag");

// Transform each value
const ids = searchParams.getAll("id", Number);
```

## Route Params

### `params()`

Returns the route parameters.

```ts
import { params } from "@minimajs/server";

app.get("/users/:id", () => {
  const routeParams = params();
  const userId = routeParams.get("id");
  return { userId };
});
```

### `params.get()`

Gets a route parameter with optional transformation.

```ts
import { params } from "@minimajs/server";

app.get("/users/:id", () => {
  // Get as string
  const userId = params.get("id");

  // Transform to number
  const numericId = params.get("id", Number);

  return { userId, numericId };
});
```

## Request Body

### `body()`

Returns the parsed request body. Requires the body parser plugin.

```ts
import { body } from "@minimajs/server";
import { bodyParser } from "@minimajs/server/plugins";

app.register(bodyParser());

app.post("/users", () => {
  const data = body();
  return { created: data };
});
```

---

## Response

### `response()`

Returns the native `Response` object for the current request context.

```ts
import { response } from "@minimajs/server";

app.get("/", () => {
  const res = response();
  console.log(res.status); // 200
  return "Hello";
});
```

### `response.status()`

Sets the HTTP status code for the response.

```ts
import { response } from "@minimajs/server";

app.get("/error", () => {
  response.status(500);
  return { error: "Internal Server Error" };
});

app.post("/created", () => {
  response.status(201);
  return { id: 123 };
});
```

### `headers.set()`

Sets response headers.

```ts
import { headers } from "@minimajs/server";

app.get("/", () => {
  headers.set("X-Custom-Header", "value");
  headers.set("Content-Type", "application/json");
  return { message: "Hello" };
});
```

---

## Modifying Response

### Custom Serializer: `app.serialize`

Define global serialization logic for all responses.

```ts
import { createApp } from "@minimajs/server";

const app = createApp({
  serialize: (data) => {
    // Wrap all responses in a standard format
    return JSON.stringify({ success: true, data });
  },
});

app.get("/users", () => {
  return [{ id: 1, name: "Alice" }];
  // Response: {"success":true,"data":[{"id":1,"name":"Alice"}]}
});
```

**Use cases:**

- Add global response wrappers
- Custom encoding formats
- Consistent API response structure

### Modifying Response Data: `transform` Hook

Use the `transform` hook to modify response data before serialization.

```ts
import { hook } from "@minimajs/server";

// Add timestamp to all responses
hook("transform", (data) => {
  return { ...data, timestamp: Date.now() };
});

app.get("/users", () => {
  return { users: [] };
  // Response: {"users":[],"timestamp":1234567890}
});
```

See [Transform Hook](/guides/hooks#transform) for more details.

### Post-Response Tasks: `send` Hook

Use the `send` hook to execute tasks after the response is sent, such as logging or cleanup.

```ts
import { hook } from "@minimajs/server";

// Log all responses after they're sent
hook("send", (response, ctx) => {
  console.log(`Response sent: ${response.status} for ${ctx.pathname}`);
});

app.get("/", () => "Hello");
// Logs: Response sent: 200 for /
```

See [Send Hook](/guides/hooks#send) for more details.

---

## Related Guides

- [Hooks](/guides/hooks) - Request lifecycle and hook system
- [Error Handling](/guides/error-handling) - Error handling patterns
- [Context](/core-concepts/context) - Request context management
