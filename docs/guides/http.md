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

#### request.ip

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

// Multiple proxies
app.register(
  request.ip.configure({
    trustProxy: true,
    proxyDepth: 2, // trust 2 proxy hops
  })
);

// Custom callback with full context access
app.register(
  request.ip.configure((ctx) => {
    // Custom logic to extract IP
    const customHeader = ctx.request.headers.get("x-custom-ip");
    if (customHeader) return customHeader;

    // Access socket directly
    if (ctx.incomingMessage) {
      return ctx.incomingMessage.socket.remoteAddress || null;
    }
    return null;
  })
);
```

**Configuration Options:**

You can pass either a Settings object or a callback function:

**Settings object:**

- `trustProxy` (boolean): Trust proxy headers (X-Forwarded-For, X-Real-IP, etc.). Default: `false`
- `header` (string): Custom header to read IP from. If not specified, tries X-Forwarded-For, X-Real-IP, CF-Connecting-IP, then falls back to socket address
- `proxyDepth` (number): Number of proxy hops to trust when using X-Forwarded-For. Default: `1` (trust the last proxy)

**Callback function:**

- `(ctx: Context) => string | null`: Custom function that receives the full request context and returns the IP address or null

**Examples:**

```typescript
const clientIp = request.ip();
console.log(clientIp); // "192.168.1.100"

// Use in route handlers
app.get("/api/info", () => {
  const ip = request.ip();
  return { clientIp: ip };
});

// Rate limiting by IP
app.post("/api/login", async () => {
  const ip = request.ip();
  await checkRateLimit(ip);
  // ... handle login
});
```

**How it works:**

1. If custom `header` is specified: Always tries this header first (regardless of `trustProxy`)
2. If `trustProxy` is `true`: Tries standard proxy headers in order:
   - `X-Forwarded-For` (respects `proxyDepth`)
   - `X-Real-IP`
   - `CF-Connecting-IP` (Cloudflare)
3. Fallback: Uses direct socket connection address
4. Returns `null` if no IP can be determined

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
headers.set(name: string, value: string): void
headers.set(headers: HeadersInit): void
```

Sets response header(s). Can set a single header or multiple headers at once.

**Examples:**

```typescript
// Single header
headers.set("x-custom-header", "value");

// Multiple headers with object
headers.set({
  "x-custom-header": "value",
  "x-another-header": "another-value",
});

// Multiple headers with array
headers.set([
  ["x-custom-header", "value"],
  ["x-another-header", "another-value"],
]);

// Using Headers object
const customHeaders = new Headers();
customHeaders.set("x-custom", "value");
headers.set(customHeaders);
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

### hook

The `hook` function creates lifecycle hook plugins that execute at specific points in the application lifecycle.

**Available lifecycle events:**

- `ready` - Executes when the application is ready
- `close` - Executes when the application is closing
- `listen` - Executes when the server starts listening
- `send` - Executes before sending the response
- `serialize` - Executes during response serialization
- `register` - Executes when a plugin is registered

**Basic Usage:**

```ts
import { createApp, hook } from "@minimajs/server";

const app = createApp();

// Register a hook that runs when the app is ready
app.register(
  hook("ready", async () => {
    console.log("Application is ready!");
  })
);

// Register a hook that runs when the app is closing
app.register(
  hook("close", async () => {
    console.log("Application shutting down");
  })
);
```

**Composing Multiple Hooks:**

Use `plugin.compose` to register multiple hooks together:

```ts
import { createApp, hook, plugin } from "@minimajs/server";

const closeDB = hook("close", async () => {
  await connection.close();
});

const connectDB = hook("ready", async () => {
  await connection.connect();
});

// Compose and register both hooks together
app.register(plugin.compose(connectDB, closeDB));
```

For more information about composing plugins, see the [Plugin guide](/guides/plugin.md).

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
