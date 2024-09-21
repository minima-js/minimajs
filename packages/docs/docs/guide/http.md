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

### getRequestURL

```ts
getRequestURL(): URL
```

### getHeaders

```typescript
getHeaders(): Record<string, string | string[]>
```

Retrieves the request headers.

### getHeader

**Function:** `getHeader(name: string, type?: Type<T> | [Type<T>] | boolean, required?: boolean): T | undefined`

**Parameters:**

- `name` (string): The name of the header to retrieve.
- `type` (Type&gt;T> | [Type&gt;T>], optional): The desired type for the retrieved value.
  - If provided, the function attempts to parse the value to the specified type.
  - Can be a single type constructor (e.g., `String`, `Number`) or an array of type constructors (e.g., `[Number]`).
- `required` (boolean, optional): Flag indicating if the parameter is mandatory. Defaults to `false`.
  - If `true` and the parameter is missing, a `ValidationError` is thrown.

**Throws:**

- `ValidationError`: Thrown in the following cases:
  - The required parameter is missing (`required` is set to `true`).
  - Parsing the value to the specified type fails (e.g., converting a string "abc" to a number throws `ValidationError`).

### getSearchParams

```typescript
getSearchParams(): URLSearchParams
```

Retrieves the request queries.

### getQueries

```ts
getQueries(): ParsedUrlQuery
```

Retrieves the query string

### getSearchParam

**Function:** `getSearchParam(name: string, type?: Type<T> | [Type<T>] | boolean, required?: boolean): T | undefined`

**Parameters:**

- `name` (string): The name of the search parameter to retrieve.
- `type` (Type&gt;T> | [Type&gt;T>], optional): The desired type for the retrieved value.
  - If provided, the function attempts to parse the value to the specified type.
  - Can be a single type constructor (e.g., `String`, `Number`) or an array of type constructors (e.g., `[Number]`).
- `required` (boolean, optional): Flag indicating if the parameter is mandatory. Defaults to `false`.
  - If `true` and the parameter is missing, a `ValidationError` is thrown.

**Return Type:**

- `T | undefined`: The retrieved and parsed value (if successful) or `undefined` if the parameter is missing and not required.

**Throws:**

- `ValidationError`: Thrown in the following cases:
  - The required parameter is missing (`required` is set to `true`).
  - Parsing the value to the specified type fails (e.g., converting a string "abc" to a number throws `ValidationError`).

**Examples:**

**Retrieving a string value:**

```typescript
const name = getSearchParam("name"); // Returns "John Doe" if the parameter exists
```

**Retrieving a number value with type conversion:**

```typescript
const pageNumber = getSearchParam("page", Number); // Returns 2 if the parameter exists and has a valid number

// Throws ValidationError if "page" is not a valid number
expect(() => getSearchParam("page", Number)).toThrow(new ValidationError("Param `page` expects a number"));
```

**Retrieving an array of numbers with type conversion:**

```typescript
const pageNumbers = getSearchParam("tags", [String]); // Returns tags array of strings
```

**Handling missing required parameters:**

```typescript
// Throws ValidationError because "page" is missing and required
expect(() => getSearchParam("page", true)).toThrow(new ValidationError("pages is required"));
```

### getParam

```typescript
export function getParam<T>(name: string, cast?: CastTo<T> | boolean, required?: boolean): T;
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
const requiredParam: string | undefined = getParam("token", false);
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

### Decorator / Filter

sometimes you need to decorator or modify response.

that's easy. you just need to create a response decorator and register it.

Creating a decorator

```ts title="src/decorator.ts"
import { createResponseDecorator } from "@minimajs/server/response";

export const decorateResponse = createResponseDecorator((response) => {
  return { decorated: true, data: response };
});
```

register it

```ts title="app.ts"
import { decorateResponse } from "./decorator";
const app = createApp();

app.register(decorateResponse);
```

## Hooks

### defer

the `defer` allows scheduling tasks for execution after sending the response.

```ts
import { defer } from "@minimajs/server";
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
abort(response: string | Record<string, unknown>, statusCode: StatusCode): never
```

Throws an HttpError to abort the current operation with a specified message and status code.

Parameters:

1. `response` (string | Record&lt;string, unknown>): A descriptive message explaining the reason for aborting the operation.
1. `statusCode` (StatusCode): An optional parameter indicating the HTTP status code associated with the abort.

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
