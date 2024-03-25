---
title: Middleware
sidebar_position: 7
tags:
  - middleware
  - interceptor
  - module
---

How could a framework exist without middleware? It's a fundamental component, enabling modular and reusable code for request handling.

## Custom middlewares

**1. Let's start by creating a loggerMiddleware:**

```ts title="src/payments/middleware.ts"
import { getRequest } from "@minimajs/server";

export async function loggerMiddleware() {
  const req = getRequest();
  console.log(req.url);
}
```

In this example, we've created a simple logger middleware that logs the URL of incoming requests.

Next, let's integrate this middleware into our application:

**2. Just wrap your module with an `interceptor`.**

```ts title="src/payments/index.ts"
// src/payments/index.ts
import { loggerMiddleware } from "./middleware.ts";
async function payments(app: App) {
  // handling routes.
  app.get("/", handleGetRequest);
}
// highlight-next-line
export const paymentsModule = interceptor([loggerMiddleware], payments);
```

Here, we've used the `interceptor` function to wrap our `payments` with the `loggerMiddleware`.

**3. Register paymentModule**

```ts title="src/index.ts"
import { paymentModule } from "src/payments";
// highlight-next-line
app.register(paymentModule, {
  prefix: "/payments",
});
```

Ensuring that all requests to the `/payments` endpoint are logged.

## Express middlewares

But what if you want to leverage existing Express middleware? Not a problem! `interceptor` is fully compatible with Express middleware:

```ts title="src/index.ts"
import { yourExpressMiddleware } from "@express/middleware-factory";

// Integrate your Express middleware with the interceptor
// highlight-next-line
app.register(interceptor([yourExpressMiddleware], paymentModule), {
  prefix: "/payments",
});
```
