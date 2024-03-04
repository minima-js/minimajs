### Middleware & Interceptor

how a framework could exists without a middleware??

let's starts with create a middleware

```ts
// src/payments/middleware.ts
import { getRequest } from "@minimajs/server";
export async function loggerMiddleware() {
  const req = getRequest();
  console.log(req.url);
}

// src/index.ts
import { interceptor } from "@minimajs/server";
import { loggerMiddleware } from "./payments/middleware";
// wrap paymentModule with interceptor
app.register(interceptor([loggerMiddleware], paymentModule), {
  prefix: "/payments",
});
```

Yes I know what you are thinking? you wan't to use existing express middleware.

I got you.

interceptor is also fully compatible with express middleware

```ts
import { yourExpressMiddleware } from "middleware/factory";

app.register(interceptor([yourExpressMiddleware], paymentModule), {
  prefix: "/payments",
});
```
