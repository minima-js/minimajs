---
title: Http Helpers
sidebar_position: 4
tags:
  - request
  - response
  - error
  - context
---

The request/response are globally accessible anywhere from request contexts.

## Request

```ts
import { getBody, getRequest } from "@minimajs/server";
app.get("/", () => {
  // highlight-next-line
  const request = getRequest();
  return request.url;
});
app.post("/", () => createUser(getBody()));
```

And even you can use request in nested function calls

```ts
function getURL() {
  // highlight-next-line
  return getRequest().url;
}
app.get("/", () => {
  const url = getURL();
  return url;
});
```

## Response

### Return value as response

just return the value will be a response

```ts
app.get("/", () => {
  return "Hello world";
});
```

### Async

```ts
app.get("/", async () => {
  const response = await fetch("https://.../");
  return response.json();
});
```

### Streams

Any Readable streams are a valid response

```ts
import { createReadStream } from "node:fs";

app.get("/", async () => {
  return createReadStream("package.json");
});
```

### Generators

```ts
import { setTimeout as sleep } from "node:timers/promise";

async function* getDates() {
  yield new Date().toString();
  await sleep(1000);
  yield new Date().toString();
}

app.get("/", getDates);
```

### Hooks

Using `defer`

```ts
function saveUser() {
  // saving user
  // save some log
  // highlight-start
  defer(() => {
    console.log("deleting log");
    // delete log
    // this will executed after request context completed
  });
  // highlight-end
}
```

## References

The following functions are exposed from `@minimajs/server` for handling HTTP requests and responses:

### getRequest

```typescript
getRequest(): Request
```

Retrieves the HTTP request object.

### getResponse

```typescript
getResponse(): Response
```

Retrieves the HTTP response object.

### getBody

```typescript
getBody<T = unknown>(): T
```

Retrieves the request body.

### setStatusCode

```typescript
setStatusCode(statusCode: keyof typeof StatusCodes | number): Response
```

Sets the HTTP status code for the response.

### getHeaders

```typescript
getHeaders(): Record<string, string | string[]>
```

Retrieves the request headers.

### getHeader

```typescript
getHeader<T = string | undefined>(name: string): T
```

Retrieves the value of a specific request header.

### getQueries

```typescript
getQueries<T = ParsedUrlQuery>(): T
```

Retrieves the URL query parameters.

### getQuery

```typescript
getQuery<T>(name: string): T
```

Retrieves the value of a specific URL query parameter.

### setHeader

```typescript
setHeader(name: string, value: string): Response
```

Sets a response header.

### redirect

```typescript
redirect(path: string, isPermanent?: boolean): never
```

Throws a RedirectError to redirect the client to a specified path.

### abort

```typescript
abort(message: string, statusCode: keyof typeof StatusCodes | number): never
```

Throws an HttpError to abort the current operation with a specified message and status code.

### assertError

```typescript
assertError(err: unknown): void
```

Asserts that the provided value is an instance of Error.

These functions provide essential utilities for handling HTTP requests and responses within request context built-in `@minimajs/server`.
