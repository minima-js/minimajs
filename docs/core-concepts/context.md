---
title: Context
sidebar_position: 3
tags:
  - context
  - async-local-storage
---

# Context: Access Data from Anywhere

In many Node.js frameworks, you need to pass the `request` and `response` objects down through your application's layers to access request-specific data. This "prop drilling" can lead to cluttered code and tight coupling.

Minima.js solves this problem with a powerful **Context** system.

At the heart of this system is Node.js's native `AsyncLocalStorage` API. This allows Minima.js to create a unique "storage" for each incoming request. Any data stored in this context is accessible from **anywhere** within the code that is executed during that specific request's lifecycle—without needing to pass `req` or `res` objects around.

## Creating and Using a Context

To create a context, you use the `createContext` function from `@minimajs/server`.

```typescript
import { createContext } from "@minimajs/server";

// Create a context to store a request-specific trace ID
const [getTraceId, setTraceId] = createContext<string>("");
```

The `createContext` function returns a tuple with two functions:

- A **getter** (`getTraceId`) to retrieve the value from the context.
- A **setter** (`setTraceId`) to set the value in the context.

Here's how you might use it:

```typescript
import { createApp, interceptor } from "@minimajs/server";
import { randomUUID } from "crypto";

// A middleware to set the trace ID for each request
async function traceIdMiddleware() {
  const traceId = randomUUID();
  setTraceId(traceId);
}

function someDeeplyNestedFunction() {
  // We can access the trace ID here without any prop drilling!
  const traceId = getTraceId();
  console.log(`Trace ID: ${traceId}`);
}

async function mainModule(app) {
  app.get("/", () => {
    someDeeplyNestedFunction();
    return { message: "Hello, World!" };
  });
}

const app = createApp();
const appModule = interceptor([traceIdMiddleware], mainModule);
app.register(appModule);

await app.listen({ port: 3000 });
```

As you can see, `someDeeplyNestedFunction` can access the `traceId` without having it passed as a parameter. This makes your code cleaner, more decoupled, and easier to reason about.

## A Practical Example: Authentication

The context is perfect for handling authentication. You can create a middleware that authenticates the user and stores the user object in the context. Then, any route handler or service can access the authenticated user directly.

**1. Create the User Context**

::: code-group

```typescript [src/auth/context.ts]
import { createContext } from "@minimajs/server";

export interface User {
  id: number;
  username: string;
}

export const [getUser, setUser] = createContext<User | null>(null);
```

:::

**2. Create the Authentication Middleware**

```typescript title="src/auth/middleware.ts"
// src/auth/middleware.ts
import { headers, intercetor } from "@minimajs/server";
import { setUser } from "./context";
import { findUserByToken } from "./service"; // Your user service

export const authentication = intercetor.use(async () => {
  const token = headers.get("authorization")?.split(" ")[1];
  const user = await findUserByToken(token);
  // Set the user in the context
  setUser(user);
});
```

**3. Access the User in a Route Handler**

```typescript title="src/profile/routes.ts"
// src/profile/routes.ts
import { type App, abort } from "@minimajs/server";
import { getUser } from "../auth/context";

function getProfile() {
  const user = getUser() ?? abort("Authnetication error", 401);
  return { id: user.id, username: user.username };
}

export async function profileRoutes(app: App) {
  app.get("/profile", () => {});
}
```

Stiching up

```ts
// src/index.ts

const app = createApp();
import { authentication } from "./auth/middleware";
import { profileRoutes } from "./profile/routes";

app.register(authentication);
app.register(profileRoutes);
await app.listen({ port: 1234 });
```

## Benefits of Using Context

- **Cleaner Code:** Eliminates the need to pass `req` and `res` everywhere.
- **Decoupling:** Your business logic doesn't need to be aware of the underlying HTTP framework.
- **Easier Third-Party Integration:** Integrate libraries that don't have direct access to `req`/`res` objects by simply calling them from within your request lifecycle code.
- **Improved Testability:** Your functions become easier to test in isolation as they have fewer dependencies.
