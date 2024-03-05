---
title: Module
sidebar_position: 6
tags:
  - module
  - context
  - interceptor
---

## Defining Modules

In Minima, everything is a module, and a module is essentially an asynchronous function.

### Creating a Module

```typescript
// src/payments/index.ts
import { type App } from "@minimajs/server";

async function getPayments() {
  // Fetch payments somehow.
  return [];
}

export async function paymentModule(app: App) {
  app.get("/", getPayments);
}

// src/index.ts
// ...
app.register(paymentModule, { prefix: "/payments" });
```

In this example:

- We define a module named `paymentModule` in `src/payments/index.ts`.
- This module exports an asynchronous function that takes an `App` object as a parameter.
- Within the module function, we define a route handler `getPayments` to handle requests to the `/payments` endpoint.
- Finally, we register the `paymentModule` with the application, specifying the prefix `/payments` for its routes in `src/index.ts`.

This approach allows for a modular and organized structure, making it easier to manage and maintain your application's codebase.
