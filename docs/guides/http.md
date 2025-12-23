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
The following functions are exposed from `@minimajs/server` for handling HTTP requests and responses:

## Request

### request

```typescript
request(): Request
```

Retrieves the HTTP request object.

Examples:

```ts
import { body, request } from "@minimajs/server";
app.get("/", () => {
  // highlight-next-line
  const req = request();
  return req.url;
});
app.post("/", () => createUser(body()));
```

And even you can use request in nested function calls

```ts
function getURL() {
  // highlight-next-line
  return request().url;
}
app.get("/", () => {
  const url = getURL();
  return url;
});
```

**Namespace utilities:**

#### request.url

```ts
request.url(): URL
```

Retrieves the full request URL.

**Examples:**

```typescript
const url = request.url();
console.log(url.pathname);
console.log(url.searchParams.get("page"));
```

#### request.route

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

### headers

```typescript
headers(): Record<string, string | string[]>
```

Retrieves the request headers.

**Namespace utilities:**

#### headers.get

```typescript
headers.get(name: string): string | undefined
headers.get<R>(name: string, transform: (value: string) => R): R | undefined
```

Retrieves a single header value by name with optional transformation.

**Examples:**

```typescript
const auth = headers.get("authorization"); // string | undefined
const token = headers.get("authorization", (val) => val.split(" ")[1]); // string | undefined
```

#### headers.getAll

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

#### headers.set

```typescript
headers.set(name: string, value: string): Response
```

Sets a response header.

**Examples:**

```typescript
headers.set("x-custom-header", "value");
```

### searchParams

```typescript
searchParams<T>(): T
```

Retrieves the search params (query string).

**Examples:**

```typescript
const query = searchParams<{ page: string }>();
console.log(query.page);

// Or use searchParams.get
const page = searchParams.get("page");
```

**Namespace utilities:**

#### searchParams.get

```typescript
searchParams.get(name: string): string | undefined
searchParams.get<R>(name: string, transform: (value: string) => R): R
```

Retrieves a single search param by name with optional transformation.

**Examples:**

```typescript
const page = searchParams.get("page"); // string | undefined
const pageNum = searchParams.get("page", (val) => parseInt(val)); // number
```

#### searchParams.getAll

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

### params

```typescript
params<T>(): T
```

Retrieves the request params (route parameters).

**Examples:**

```typescript
const p = params<{ id: string }>();
console.log(p.id);

// Or use params.get
const id = params.get("id");
```

**Namespace utilities:**

#### params.get

```typescript
params.get(name: string): string
params.get<R>(name: string, transform: (value: string) => R): R
```

Retrieves a single param by name with optional transformation. Throws `NotFoundError` if the param is not found.

**Examples:**

```typescript
const id = params.get("id"); // string
const page = params.get("page", (val) => parseInt(val)); // number
const age = params.get("age", (val) => {
  const num = parseInt(val);
  if (num < 0) throw new Error("must be positive");
  return num;
}); // number
```

#### params.optional

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

### body

```typescript
body<T = unknown>(): T
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

### response

```typescript
response(): Response
```

Retrieves the HTTP response object.

**Namespace utilities:**

#### response.status

```typescript
response.status(statusCode: keyof typeof StatusCodes | number): Response
```

Sets the HTTP status code for the response.

**Examples:**

```typescript
response.status(200);
response.status("CREATED");
```

### Decorator / Filter

sometimes you need to decorator or modify response.

that's easy. you just need to create a response decorator and register it.

Creating a decorator

```ts title="src/decorator.ts"
import { interceptor } from "@minimajs/server";

export const decorateResponse = interceptor.response((response) => {
  return { decorated: true, data: response };
});
```

register it

```ts title="app.ts"
import { decorateResponse } from "./decorator";
const app = createApp();

app.register(decorateResponse);
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
abort(response: string | Record<string, unknown>, statusCode: StatusCode): never
```

Throws an HttpError to abort the current operation with a specified message and status code.

Parameters:

1. `response` (string | Record&lt;string, unknown>): A descriptive message explaining the reason for aborting the operation.
1. `statusCode` (StatusCode): An optional parameter indicating the HTTP status code associated with the abort.

Examples:

```ts
import { abort, params } from "@minimajs/server";

async function findUser() {
  const userId = params.get("user");
  const user = await User.findOne({ _id: userId });
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

You can also use the namespace utility `abort.notFound()`:

```ts
import { abort, params } from "@minimajs/server";

async function findUser() {
  const userId = params.get("user");
  const user = await User.findOne({ _id: userId });
  if (!user) {
    // highlight-next-line
    abort.notFound();
  }
  return user;
}
```

These functions provide essential utilities for handling HTTP requests and responses within request context built-in `@minimajs/server`.
