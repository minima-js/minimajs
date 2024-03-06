---
title: Middleware
sidebar_position: 7
tags:
  - middleware
  - interceptor
  - module
---

How could a framework exist without middleware? It's a fundamental component, enabling modular and reusable code for request handling.

Let's start by creating a middleware:

```ts title="src/payments/middleware.ts"
import { getRequest } from "@minimajs/server";

export async function loggerMiddleware() {
  const req = getRequest();
  console.log(req.url);
}
```

In this example, we've created a simple logger middleware that logs the URL of incoming requests.

Next, let's integrate this middleware into our application:

```ts title="src/index.ts"
import { interceptor } from "@minimajs/server";
import { loggerMiddleware } from "./payments/middleware";

// Register the loggerMiddleware with an interceptor
// highlight-next-line
app.register(interceptor([loggerMiddleware], paymentModule), {
  prefix: "/payments",
});
```

Here, we've used the `interceptor` function to wrap our `paymentModule` with the `loggerMiddleware`, ensuring that all requests to the `/payments` endpoint are logged.

But what if you want to leverage existing Express middleware? Not a problem! `interceptor` is fully compatible with Express middleware:

```ts title="src/index.ts"
import { yourExpressMiddleware } from "middleware/factory";

// Integrate your Express middleware with the interceptor
// highlight-next-line
app.register(interceptor([yourExpressMiddleware], paymentModule), {
  prefix: "/payments",
});
```

With `interceptor`, you can seamlessly use Express middleware within your minimajs application, making it easy to transition existing codebases or leverage a rich ecosystem of middleware libraries.
