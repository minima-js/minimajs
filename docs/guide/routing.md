---
title: Routing
sidebar_position: 3
tags:
  - app
---

### The Basic

```ts
app.get("/", () => "Welcome Home!");
```

That's it.

```bash
curl http://localhost:1234
> Welcome Home!
```

```ts
app.route(options);
```

**Routes options:**

- `method`: currently it supports 'DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS', 'SEARCH', 'TRACE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK' and 'UNLOCK'. It could also be an array of methods.
- `url`: the path of the URL to match this route (alias: path).
- `handler(request, reply)`: the function that will handle this request.
- `bodyLimit`: prevents the default JSON body parser from parsing request bodies larger than this number of bytes. Must be an integer. You may also set this option globally when first creating the `app` instance with `createApp(options)`. Defaults to 1048576 (1 MiB).
- `logLevel`: set log level for this route. See below.

Example:

```ts
app.route({
  method: "GET",
  url: "/",
  handler() {
    return "Hello World";
  },
});
```

### Available methods

The router allows you to register routes that respond to any HTTP verb:

```ts
app.get(path, [options], handler);
app.post(path, [options], handler);
app.put(path, [options], handler);
app.patch(path, [options], handler);
app.delete(path, [options], handler);
app.head(path, [options], handler);
app.options(path, [options], handler);
app.all(path, [options], handler); // will add the same handler to all the supported methods.
```

### Route Parameters

```ts
app.get("/users/:user", () => {
  const params = getParams<{ user: string }>();
  return { user: params.user };
});
```

You may define as many route parameters as required by your route:

```ts
app.get("/posts/:post/comments/:comment", () => {
  // highlight-next-line
  const params = getParams<{ post: string; comment: string }>();
  return [params.post, params.comment];
});
```

### Optionals parameters

The last parameter can be made optional if you add a question mark ("?") to the end of the parameters name.

```ts
// highlight-next-line
app.get("/posts/:post?", () => {
  const params = getParams<{ post?: string }>();
  return [params.post ?? "not defined"];
});
```

In this case you can request /example/posts as well as /example/posts/1. The optional param will be undefined if not specified.

### Wildcard

For wildcard, use the star. Remember that static routes are always checked before parametric and wildcard.

```ts
// highlight-next-line
app.get("/posts/*", () => {
  const params = getParams<{ post?: string }>();
  return [params.post ?? "not defined"];
});
```

### RegExp

Regular expression routes are supported as well, but be aware that you have to escape slashes. Take note that RegExp is also very expensive in terms of performance!

```ts
// parametric with regexp
app.get("/example/:file(^\\d+).png", function () {
  // curl ${app-url}/example/12345.png
  // file === '12345'
  const file = getParam("file");
  // your code here
});
```

It is possible to define more than one parameter within the same couple of slash ("/"). Such as:

```ts
import { getParams } from "@minimajs/server";
app.get("/example/near/:lat-:lng/radius/:r", function () {
  // curl ${app-url}/example/near/15°N-30°E/radius/20
  // lat === "15°N"
  // lng === "30°E"
  // r ==="20"
  const { lat, lng, r } = getParams<{ lat: string; lng: string; r: string }>();
  // your code here
});
```

_Remember in this case to use the dash ("-") as parameters separator._

Finally, it is possible to have multiple parameters with RegExp:

```ts
app.get("/example/at/:hour(^\\d{2})h:minute(^\\d{2})m", () => {
  // curl ${app-url}/example/at/08h24m
  // hour === "08"
  // minute === "24"
  const { hour, minute } = getParams<{ hour: string; minute: string }>();
  // your code here
});
```

In this case as parameter separator it is possible to use whatever character is not matched by the regular expression.

If you want a path containing a colon without declaring a parameter, use a double colon. For example:

```ts
app.post("/name::verb"); // will be interpreted as /name:verb
```

Having a route with multiple parameters may negatively affect performance, so prefer a single parameter approach whenever possible, especially on routes that are on the hot path of your application.

If you are interested in how we handle the routing, check out [find-my-way](https://github.com/delvedor/find-my-way)
