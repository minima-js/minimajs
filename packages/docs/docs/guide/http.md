---
title: Http Helpers
sidebar_position: 4
tags:
  - request
  - response
  - error
  - context
  - hooks
---

The request/response are globally accessible anywhere from request contexts.
The following functions are exposed from `@minimajs/server` for handling HTTP requests and responses:

## Request

### getRequest

```typescript
getRequest(): Request
```

Retrieves the HTTP request object.

Examples:

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

### getSearchParams

```typescript
getSearchParams<T = ParsedUrlQuery>(): T
```

Retrieves the URL query parameters.

### getParam

```typescript
export function getParam<T>(name: string, cast?: CastTo<T> | null, required?: boolean): T;
```

Retrieves and validates parameters from the current request context. It optionally casts the values to a specified type and enforces that the parameter is required.

Examples

```typescript
// Basic usage
const paramName: string = getParam("name");

// Casting to a specific type
const paramValue: number = getParam("age", Number);

// Casting to an optional type with a specific cast function
const optionalParamValue: number | undefined = getParam("optional", Number, false);

// Casting to an optional type with custom validation
const customValidationParam: string | undefined = getParam("custom", (value) => {
  if (typeof value === "string" && value.length < 10) {
    return value;
  }
  throw new Error("Invalid value");
});

// Optional param
const requiredParam: string | undefined = getParam("token", null, false);
```

### getSearchParam

Retrieves and validates query parameters from the current request context. It optionally casts the values to a specified type or array of types and enforces that the parameter is required.

```ts
// Basic usage
const paramName: string | undefined = getSearchParam("name");

// Casting to a specific type
const paramValue: number | undefined = getSearchParam("age", Number);

// Casting to an array of a specific type
const paramValues: string[] | undefined = getSearchParam("tags", [String]);

// Enforcing that the parameter is required
const requiredParam: string = getSearchParam("token", null, true);
```

### getBody

```typescript
getBody<T = unknown>(): T
```

Retrieves the request body.

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

### getResponse

```typescript
getResponse(): Response
```

Retrieves the HTTP response object.

### setStatusCode

```typescript
setStatusCode(statusCode: keyof typeof StatusCodes | number): Response
```

Sets the HTTP status code for the response.

### setHeader

```typescript
setHeader(name: string, value: string): Response
```

Sets a response header.

## Hooks

### defer

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

## Exceptions

### redirect

Redirects the client to the specified path.

```typescript
redirect(path: string, isPermanent?: boolean): never
```

Throws a RedirectError to redirect the client to a specified path.

Parameters:

1. `path` (string): The URL path to redirect to.
2. `isPermanent` (boolean): Optional parameter indicating whether the redirect is permanent (HTTP status code 301) or temporary (HTTP status code 302). Default is false.

Examples:

```ts
import { redirect } from "@minimajs/server";

async function handleRequest() {
  // Example 1: Redirect to a specific path
  redirect("/home");

  // Example 2: Redirect permanently to a different path
  redirect("/new-home", true);
}
```

### abort

Terminates the current operation with an optional message and HTTP status code.

```typescript
abort(message: string, statusCode: keyof typeof StatusCodes | number): never
```

Throws an HttpError to abort the current operation with a specified message and status code.

Parameters:

1. `message` (string): A descriptive message explaining the reason for aborting the operation.
1. `statusCode` (number | StatusCodes): An optional parameter indicating the HTTP status code associated with the abort.

Examples:

```ts
import { abort, getParam } from "@minimajs/server";

async function findUser() {
  const param = getParam("user");
  const user = await User.findOne({ _id: param });
  if (!user) {
    // example 1: status code as number
    // highlight-next-line
    abort("User doesn't exists", 404);
    // i won't be reachable
  }
  if (user.type !== "admin") {
    // Example 2: Abort with a custom message and status code
    // highlight-next-line
    abort("Unauthorized access", "UNAUTHORIZED");
  }
  return user;
}

app.get("/users/:user", findUser);
```

These functions provide essential utilities for handling HTTP requests and responses within request context built-in `@minimajs/server`.
