---
title: Response
sidebar_position: 5
tags:
  - response
  - status
  - redirect
  - abort
---

# Response

Minima.js provides flexible ways to send responses, from simple return values to streaming data.

## Return Value as Response

Simply return a value to send it as a response:

```typescript
app.get("/", () => {
  return "Hello world";
});
```

## Async Responses

Handle asynchronous operations naturally:

```typescript
app.get("/", async () => {
  const response = await fetch("https://.../");
  return response.json();
});
```

## Streams

Any readable stream is a valid response:

```typescript
import { createReadStream } from "node:fs";

app.get("/", () => {
  return createReadStream("package.json");
});
```

## Generators

Use async generators for streaming responses:

```typescript
import { setTimeout as sleep } from "node:timers/promises";

async function* getDates() {
  yield new Date().toString();
  await sleep(1000);
  yield new Date().toString();
}

app.get("/", getDates);
```

## response

```typescript
response(): Response
```

Retrieves the HTTP response object.

### response.status

```typescript
response.status(statusCode: keyof typeof StatusCodes | number): Response
```

Sets the HTTP status code for the response.

**Examples:**

```typescript
response.status(200);
response.status("CREATED");
```

## Response Decorator

Sometimes you need to decorate or modify responses. Create a response interceptor and register it.

**Creating a decorator:**

```typescript title="src/decorator.ts"
import { interceptor } from "@minimajs/server";

export const decorateResponse = interceptor.response((response) => {
  return { decorated: true, data: response };
});
```

**Register it:**

```typescript title="app.ts"
import { decorateResponse } from "./decorator";

const app = createApp();
app.register(decorateResponse);
```

## Redirects

### redirect

```typescript
redirect(path: string, isPermanent?: boolean): never
```

Redirects the client to the specified path.

**Parameters:**

- `path` (string): The URL path to redirect to
- `isPermanent` (boolean): Optional. If true, sends HTTP 301 (permanent), otherwise 302 (temporary). Default is false.

**Examples:**

```typescript
import { redirect } from "@minimajs/server";

app.get("/old-path", () => {
  redirect("/new-path"); // Temporary redirect
});

app.get("/legacy", () => {
  redirect("/modern", true); // Permanent redirect
});
```

## Error Handling

For comprehensive error handling, see the [Error Handling](/guides/error-handling) guide.

### abort

```typescript
abort(response: string | Record<string, unknown>, statusCode: StatusCode): never
```

Terminates the current operation with an HTTP error. This is the recommended way to throw HTTP errors in Minima.js.

**Quick Example:**

```typescript
import { abort, params } from "@minimajs/server";

app.get("/users/:id", async () => {
  const userId = params.get("id");
  const user = await User.findOne({ _id: userId });

  if (!user) {
    abort("User not found", 404);
  }

  return user;
});
```

**Additional Helpers:**

- `abort.notFound()` - Shorthand for 404 errors
- `abort.is(error)` - Check if error is an abort error
- `abort.assert(error)` - Ensure error is an abort error, re-throw if not
- `abort.rethrow(error)` - Re-throw only if it IS an abort error

For detailed error handling including global error handlers, module-level error interceptors, and custom error responses, see the [Error Handling](/guides/error-handling) guide.
