---
title: JWT Authentication
sidebar_position: 1
---

# JWT Authentication

This cookbook shows you how to implement JWT-based authentication in your Minima.js application using the `@minimajs/auth` package. We'll build a complete authentication system with login, token generation, and protected routes.

## Prerequisites

Install the required packages:

```bash
npm install @minimajs/auth jsonwebtoken
npm install -D @types/jsonwebtoken
```

## Step 1: Create the Authentication Plugin

Use `createAuth` to create an authentication plugin and resource accessor. The plugin will verify JWT tokens from the Authorization header.

```typescript title="src/auth/index.ts"
import { headers } from "@minimajs/server";
import { createAuth, UnauthorizedError } from "@minimajs/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface User {
  id: number;
  username: string;
}

export const [authPlugin, getUser] = createAuth<User>(async () => {
  const authHeader = headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    return { id: decoded.userId, username: decoded.username };
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired token");
  }
});
```

**Key Points:**

- `createAuth` returns `[plugin, resource]` - a plugin to register and a function to access the authenticated user
- The callback throws `UnauthorizedError` when authentication fails
- In optional mode (default), failed authentication is stored and `getUser()` returns `undefined`

## Step 2: Create Authentication Guards

Guards are middleware functions that enforce authentication requirements for specific routes.

```typescript title="src/auth/guards.ts"
import { getUser } from "./index";
import { ForbiddenError } from "@minimajs/server/error";

// Basic authentication guard
export function authenticated() {
  getUser.required(); // Throws UnauthorizedError if not authenticated
}

// Admin-only guard
export async function adminOnly() {
  // async is required, otherwise need to call done
  const user = getUser.required();

  // Add your admin check logic here
  if (!user.isAdmin) {
    throw new ForbiddenError("Admin access required");
  }
}
```

## Step 3: Create Login Route

Create a route that generates JWT tokens for authenticated users.

```typescript title="src/auth/routes.ts"
import { type App, body } from "@minimajs/server";
import { UnauthorizedError } from "@minimajs/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Mock user database (replace with real database)
const users = [
  { id: 1, username: "john.doe", password: "password123" },
  { id: 2, username: "jane.smith", password: "secret456" },
];

export async function authRoutes(app: App) {
  app.post("/login", () => {
    const { username, password } = body<{ username: string; password: string }>();

    const user = users.find((u) => u.username === username && u.password === password);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });

    return { token };
  });
}
```

## Step 4: Create Protected Routes

Create routes that require authentication using the guard we created.

```typescript [src/profile/routes.ts]
import { type App } from "@minimajs/server";
import { getUser } from "../auth";

export async function profileRoutes(app: App) {
  app.get("/profile", () => {
    const user = getUser(); // User is guaranteed to exist because of the guard
    return {
      id: user.id,
      username: user.username,
    };
  });

  app.get("/settings", () => {
    const user = getUser();
    return {
      username: user.username,
      // Add user settings here
    };
  });
}
```

## Step 5: Put It All Together

Register the auth plugin globally and use interceptors to protect specific routes.

```typescript title="src/index.ts"
import { createApp, interceptor } from "@minimajs/server";
import { authPlugin } from "./auth";
import { authenticated } from "./auth/guards";
import { authRoutes } from "./auth/routes";
import { profileRoutes } from "./profile/routes";

const app = createApp();

// Register auth plugin globally - this enables authentication checking for all routes
app.register(authPlugin);

// Public routes - no guard required
app.register(authRoutes);

// Protected routes - wrapped with authenticated guard
app.register(interceptor([authenticated], profileRoutes));

await app.listen({ port: 3000 });
```

## Testing the API

### 1. Login to get a token

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john.doe", "password": "password123"}'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Access protected route with token

```bash
curl http://localhost:3000/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**

```json
{
  "id": 1,
  "username": "john.doe"
}
```

### 3. Access protected route without token

```bash
curl http://localhost:3000/profile
```

**Response:**

```json
{
  "message": "No token provided"
}
```

## Alternative: Required Authentication Mode

If you want to protect ALL routes by default, use `required: true`:

```typescript title="src/auth/index.ts"
export const [authPlugin, getUser] = createAuth<User>(
  async () => {
    const authHeader = headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
      return { id: decoded.userId, username: decoded.username };
    } catch (error) {
      throw new UnauthorizedError("Invalid or expired token");
    }
  },
  { required: true } // All routes protected by default
);
```

With `required: true`:

- `getUser()` returns `User` (not `User | undefined`)
- No need for guards - all routes are automatically protected
- No null checks needed in route handlers

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { authPlugin, getUser } from "./auth";

const app = createApp();

// All routes are now protected automatically
app.register(authPlugin);

app.get("/profile", () => {
  const user = getUser(); // Type: User (not User | undefined)
  return { id: user.id, username: user.username }; // No null checks needed
});

await app.listen({ port: 3000 });
```

## Best Practices

1. **Use Environment Variables**: Store JWT secrets in environment variables, never hardcode them
2. **Set Appropriate Expiration**: Use reasonable token expiration times (e.g., 15m for access tokens)
3. **Implement Refresh Tokens**: For long-lived sessions, implement refresh token rotation
4. **Hash Passwords**: Never store plain-text passwords - use bcrypt or argon2
5. **Validate Input**: Always validate request bodies and handle errors properly
6. **Use HTTPS**: Always use HTTPS in production to protect tokens in transit

## Next Steps

- Implement password hashing with bcrypt
- Add refresh token rotation
- Implement role-based access control (RBAC)
- Add rate limiting to prevent brute force attacks
- Store tokens securely on the client side
