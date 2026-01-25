---
title: JWT Authentication
sidebar_position: 1
---

# JWT Authentication

This recipe shows you how to implement JWT-based authentication using Minima.js's file-based module system. We'll use the `@minimajs/auth` package and `jsonwebtoken`, organizing everything into auto-discovered modules with `meta.plugins`.

## Prerequisites

First, you need to install the required packages:

```bash
npm install @minimajs/auth jsonwebtoken
npm install -D @types/jsonwebtoken
```

## Project Structure

Here's our complete file structure using file-based module discovery:

```
src/
├── index.ts              # Entry point (auto-discovers modules)
├── auth/
│   ├── tools.ts          # Auth plugin & getUser helper
│   ├── guard.ts          # Guard plugin for protected routes
│   └── module.ts         # Public routes: POST /auth/login
└── profile/
    └── module.ts         # Protected routes: GET /profile/me, /profile/settings
```

**Key points:**

- `module.ts` files are auto-discovered and loaded
- Each module declares its plugins via `export const meta: Meta`
- No manual registration needed - just create files!

## 1. Creating the Auth Tools

Use the `createAuth` function from `@minimajs/auth` to create a reusable authentication plugin and a `getUser` helper to access the authenticated user.

::: code-group

```typescript [src/auth/tools.ts]
import { createAuth } from "@minimajs/auth";
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

:::

## 2. Creating a Guard Plugin

A "guard" is a plugin that ensures a user is authenticated before allowing access to a route. Create it as a reusable plugin that can be added to `meta.plugins`.

::: code-group

```typescript [src/auth/guard.ts]
import { plugin, hook } from "@minimajs/server";
import { getUser } from "./tools.js";

// This is our guard plugin - can be used in meta.plugins
export const guardPlugin = plugin((app) => {
  app.register(
    hook("request", () => {
      // .required() throws an UnauthorizedError if the user is not authenticated
      getUser.required();
    })
  );
});
```

:::

## 3. Public Auth Routes (Login)

Create the auth module with public routes (login). Register the `authPlugin` in `meta.plugins` to make `getUser()` available in this module's routes.

::: code-group

```typescript [src/auth/module.ts]
import { body, type Meta } from "@minimajs/server";
import * as jwt from "jsonwebtoken";
import { UnauthorizedError } from "@minimajs/auth";
import { authPlugin } from "./tools.js";

const JWT_SECRET = "your-super-secret-key";

// A mock user database
const users = [{ id: 1, username: "john.doe", password: "password123" }];

// Register authPlugin to make getUser() available
export const meta: Meta = {
  plugins: [authPlugin],
};

export default async function (app) {
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
// ✅ Auto-loaded as /auth/login
```

:::

## 4. Protected Routes Module

Create a protected module by adding both `authPlugin` and `guardPlugin` to `meta.plugins`. The guard ensures the user is authenticated before accessing routes.

::: code-group

```typescript [src/profile/module.ts]
import { type Meta } from "@minimajs/server";
import { authPlugin, getUser } from "../auth/tools.js";
import { guardPlugin } from "../auth/guard.js";

// Apply both auth and guard plugins
export const meta: Meta = {
  plugins: [
    authPlugin, // Makes getUser() available
    guardPlugin, // Ensures user is authenticated
  ],
};

export default async function (app) {
  app.get("/me", () => {
    // Because guard is applied, getUser() will always return a user here
    const user = getUser();
    return { user };
  });

  app.get("/settings", () => {
    const user = getUser();
    return {
      user,
      message: "User settings",
    };
  });
}
// ✅ Auto-loaded as /profile/*
// ✅ All routes are protected by guardPlugin
```

:::

## 5. Entry Point

The entry point is minimal - just create the app and let module discovery do the rest!

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers all modules

await app.listen({ port: 3000 });
```

:::

### Alternative: Global Auth via Root Module

If you want `getUser()` available in **all modules** without repeating `authPlugin`, create a root module:

::: code-group

```typescript [src/module.ts]
import { type Meta } from "@minimajs/server";
import { authPlugin } from "./auth/tools.js";

// Root module - all child modules inherit these plugins
export const meta: Meta = {
  plugins: [
    authPlugin, // Now available in ALL modules
  ],
};

export default async function (app) {
  app.get("/health", () => "ok");
}
```

```typescript [src/auth/module.ts]
import { body, type Meta } from "@minimajs/server";
import { getUser } from "./tools.js"; // ✅ authPlugin inherited from root

export default async function (app) {
  app.post("/login", () => {
    // ... login logic
  });
}
```

```typescript [src/profile/module.ts]
import { type Meta } from "@minimajs/server";
import { getUser } from "../auth/tools.js"; // ✅ authPlugin inherited from root
import { guardPlugin } from "../auth/guard.js";

// Only need guard here - authPlugin comes from root
export const meta: Meta = {
  plugins: [guardPlugin],
};

export default async function (app) {
  app.get("/me", () => {
    const user = getUser();
    return { user };
  });
}
```

:::

This approach is cleaner when most of your modules need authentication.

## How It Works

With file-based module discovery:

1. **`/auth/login`** (public) - No guard, anyone can login
2. **`/profile/me`** (protected) - Guard in `meta.plugins` ensures authentication
3. **`/profile/settings`** (protected) - Same guard applies to all routes in module

**API Routes:**

- `POST /auth/login` - Public (login with credentials, get JWT)
- `GET /profile/me` - Protected (returns authenticated user)
- `GET /profile/settings` - Protected (returns user settings)

**Testing:**

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john.doe", "password": "password123"}'

# Response: { "token": "eyJhbG..." }

# 2. Access protected route with token
curl http://localhost:3000/profile/me \
  -H "Authorization: Bearer eyJhbG..."

# Response: { "user": { "id": 1, "username": "john.doe" } }

# 3. Without token -> 401 Unauthorized
curl http://localhost:3000/profile/me
```

This approach provides a clean, file-based way to handle authentication and authorization in your Minima.js application. Each module declares its own requirements via `meta.plugins`, making it easy to see what protection applies to each feature.
