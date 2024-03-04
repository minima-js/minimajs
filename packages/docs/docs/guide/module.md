---
title: Module
---

## Defining Modules

in Minima, everything is a module, and a module is nothing but a async function.

### Creating a module

```ts
// src/payments/index.ts
import { type App } from "@minimajs/server";
async function getPayments() {
  // fetch payments somehow.
  return [];
}
export async function paymentModule(app: App) {
  app.get("/", getPayments);
}

// src/index.ts
// ...
app.register(paymentModule, { prefix: "/payments" });
```
