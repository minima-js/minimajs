---
title: JWT Authentication
sidebar_position: 1
---

# JWT Authentication

This recipe will show you how to implement JWT-based authentication in your Minima.js application. We will use the `@minimajs/auth` package to create authentication plugins and `jsonwebtoken` to generate and verify JWTs.

## Prerequisites

First, you need to install the required packages:

```bash
npm install @minimajs/auth jsonwebtoken
npm install -D @types/jsonwebtoken
```

## 1. Creating the Auth Tools

The first step is to use the `createAuth` function from `@minimajs/auth`. This creates a reusable authentication plugin and a `getUser` resource accessor to get the authenticated user from the context.

```typescript title="src/auth/tools.ts"
import { createAuth, UnauthorizedError } from "@minimajs/auth";
import { headers } from "@minimajs/server";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = "your-super-secret-key";

// A simple user type for demonstration
export interface User {
  id: number;
  username: string;
}

// createAuth returns a plugin and a getter function.
// We are using optional authentication mode here.
export const [authPlugin, getUser] = createAuth(async (): Promise<User | null> => {
  const authHeader = headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null; // No token, so no user
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    return { id: decoded.userId, username: decoded.username };
  } catch (error) {
    // For optional auth, you can return null for invalid tokens
    // or throw an error if you want to handle it specifically.
    return null;
  }
});
```

## 2. Creating a Guard

A "guard" is a middleware that ensures a user is authenticated before allowing access to a route. With `@minimajs/auth`, you can easily create one using the `getUser` accessor.

```typescript title="src/auth/guard.ts"
import { plugin, hook } from "@minimajs/server";
import { getUser } from "./tools";

// This is our guard middleware, wrapped in a plugin
export const guardPlugin = plugin((app) => {
  app.register(hook("request", () => {
    // .required() throws an UnauthorizedError if the user is not authenticated
    getUser.required();
  }));
});
```

## 3. Generating Tokens

Next, we need a way to generate a JWT when a user logs in. Let's create a module with a `/login` route.

```typescript title="src/auth/routes.ts"
import { type App, body } from "@minimajs/server";
import * as jwt from "jsonwebtoken";
import { UnauthorizedError } from "@minimajs/auth";

const JWT_SECRET = "your-super-secret-key";

// A mock user database
const users = [{ id: 1, username: "john.doe", password: "password123" }];

export async function authRoutes(app: App) {
  app.post("/login", () => {
    const { username, password } = body<{ username?: string; password?: string }>();

    const user = users.find((u) => u.username === username && u.password === password);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return { token };
  });
}
```

## 4. Putting It All Together

Finally, let's wire everything up. We'll register the main `authPlugin` globally to make `getUser` available everywhere. Then, we'll use `compose.create()` to apply our `guardPlugin` only to the routes that need protection.

Let's create a protected route module first:

```typescript title="src/profile/routes.ts"
import { type App } from "@minimajs/server";
import { getUser } from "../auth/tools";

export async function profileRoutes(app: App) {
  app.get("/profile", () => {
    // Because a guard is applied, getUser() will always return a user here.
    const user = getUser();
    return { user };
  });
}
```

Now, we combine everything in the main application file:

```typescript title="src/index.ts"
import { createApp, compose } from "@minimajs/server";
import { authPlugin } from "./auth/tools";
import { guardPlugin } from "./auth/guard";
import { authRoutes } from "./auth/routes";
import { profileRoutes } from "./profile/routes";

const app = createApp();

// 1. Register the main auth plugin globally.
// This makes `getUser()` available everywhere but doesn't protect any routes.
app.register(authPlugin);

// 2. Public routes can be registered directly.
app.register(authRoutes);

// 3. Create a middleware applicator with our guard plugin.
const withAuthGuard = compose.create(guardPlugin);

// 4. Apply the guard to the protected routes module.
const protectedProfileRoutes = withAuthGuard(profileRoutes);

// 5. Register the protected module.
app.register(protectedProfileRoutes);

await app.listen({ port: 3000 });
```

In this setup:
- The `/login` route is public.
- The `/profile` route is protected and will return a 401 error if a valid JWT is not provided.

This approach provides a clean and composable way to handle authentication and authorization in your Minima.js application.