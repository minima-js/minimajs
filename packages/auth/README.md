# @minimajs/auth

Authentication and authorization utilities for MinimaJS applications with powerful type-safe middleware and guard support.

```bash npm2yarn
npm i @minimajs/auth
```

## Overview

The `@minimajs/auth` package provides a powerful and type-safe way to implement authentication in your MinimaJS applications. It uses the concept of middleware plugins and resource accessors to handle authentication logic, making it easy to protect routes and access authenticated user data throughout your application.

### Key Features

- **Type-Safe**: Full TypeScript support with automatic type inference
- **Flexible**: Support for both optional and required authentication modes
- **Context-Aware**: Authentication data is automatically isolated per request
- **Error Handling**: Graceful handling of authentication failures with proper HTTP error responses
- **Guard Support**: Easy creation of authorization guards for route protection

## Core API: `createAuth`

The `createAuth` function is the primary API for setting up authentication in your MinimaJS application. It creates a middleware plugin and a resource accessor function.

### Signature

```typescript
function createAuth<T>(
  callback: () => Promise<T> | T,
  option?: { required?: boolean }
): [Plugin<RegisterMiddleware>, AuthResource<T>];
```

### Parameters

- **`callback`**: An async or sync function that performs your authentication logic

  - Should return the authenticated data (e.g., user object)
  - Should throw a `BaseHttpError` (like `UnauthorizedError`) if authentication fails
  - Executed once per request before route handlers run

- **`option`**: Optional configuration object
  - `required: true` - Makes authentication mandatory for all routes using this plugin
  - If omitted - Authentication is optional, allowing routes to handle missing auth gracefully

### Returns

A tuple `[plugin, resource]`:

- **`plugin`**: Middleware plugin to register with your app
- **`resource`**: Function to access authenticated data with two modes:
  - `resource()` - Returns the auth data or `undefined` (if optional mode)
  - `resource.required()` - Always returns the auth data or throws an error

## Basic Usage: Optional Authentication

Optional authentication allows routes to handle both authenticated and unauthenticated requests:

```typescript title="src/auth/index.ts"
import { headers } from "@minimajs/server";
import { createAuth, UnauthorizedError } from "@minimajs/auth";

export const [authPlugin, getUser] = createAuth(async () => {
  const token = headers.get("x-user-token");

  if (!token) {
    throw new UnauthorizedError("No token provided");
  }

  const user = await User.findByToken(token);
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  return user;
});
```

### Using in Your Application

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { authPlugin, getUser } from "./auth";

const app = createApp();

// Register the auth plugin globally
app.register(authPlugin);

// Public route - handles both authenticated and unauthenticated users
app.get("/", () => {
  const user = getUser(); // User | undefined

  if (user) {
    return { message: `Welcome back, ${user.name}!` };
  }

  return { message: "Welcome, guest!" };
});

// You can also use optional chaining
app.get("/profile", () => {
  const userName = getUser()?.name;
  return { name: userName ?? "Anonymous" };
});
```

## Creating Authorization Guards

Guards are functions that enforce authentication requirements for specific routes or route groups. They're useful when you want to protect certain routes while keeping others public.

### Creating a Basic Guard

```typescript title="src/auth/guards.ts"
import { getUser } from "./index";

// Simple guard that requires authentication
export function authenticated() {
  getUser.required(); // Throws UnauthorizedError if not authenticated
}

// Guard for admin-only routes
export function adminOnly() {
  const user = getUser.required();

  if (!user.isAdmin) {
    throw new ForbiddenError("Admin access required");
  }
}

// Guard with custom permissions
export function requirePermission(permission: string) {
  return () => {
    const user = getUser.required();

    if (!user.permissions.includes(permission)) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  };
}
```

### Using Guards with Interceptors

Use the `interceptor` function to apply guards to specific routes or route modules:

```typescript title="src/index.ts"
import { createApp, interceptor } from "@minimajs/server";
import { authPlugin, getUser } from "./auth";
import { authenticated, adminOnly } from "./auth/guards";

const app = createApp();

// Register auth plugin globally
app.register(authPlugin);

// Public routes (no guard)
app.get("/", () => ({ message: "Public endpoint" }));

// Protected routes with guards
function protectedRoutes(app: App) {
  app.get("/dashboard", () => {
    const user = getUser(); // TypeScript knows this is defined because of the guard
    return { message: `Welcome ${user.name}` };
  });

  app.get("/settings", () => {
    return { settings: getUser().preferences };
  });
}

function adminRoutes(app: App) {
  app.get("/admin/users", () => {
    return { users: getAllUsers() };
  });

  app.delete("/admin/user/:id", () => {
    // Admin only logic
  });
}

// Apply guards to route groups
app.register(interceptor([authenticated], protectedRoutes));
app.register(interceptor([adminOnly], adminRoutes));
```

## Required Authentication Mode

When you need to protect all routes by default, use the `required: true` option. This makes authentication mandatory and simplifies your code by removing the need for null checks.

### Setting Up Required Authentication

```typescript title="src/auth/index.ts"
import { headers } from "@minimajs/server";
import { createAuth, UnauthorizedError } from "@minimajs/auth";

export const [authPlugin, getUser] = createAuth(
  async () => {
    const token = headers.get("x-user-token");

    if (!token) {
      throw new UnauthorizedError("Authentication required");
    }

    const user = await User.findByToken(token);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    return user;
  },
  { required: true } // All routes will require authentication
);
```

### Using Required Authentication

With `required: true`, the resource accessor always returns a non-nullable type:

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";
import { authPlugin, getUser } from "./auth";

const app = createApp();

// Register the auth plugin - this protects ALL routes
app.register(authPlugin);

app.get("/profile", () => {
  const user = getUser(); // User (not User | undefined)
  // No need for null checks - TypeScript knows user exists
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
});

app.get("/settings", () => {
  // Direct property access without optional chaining
  return {
    preferences: getUser().preferences,
    theme: getUser().settings.theme,
  };
});
```

### Benefits of Required Mode

1. **Type Safety**: TypeScript knows the user is always defined
2. **Cleaner Code**: No need for null checks or optional chaining
3. **Automatic Protection**: All routes are protected by default
4. **Early Errors**: Authentication failures happen before route handlers execute

## TypeScript Support

The `createAuth` function provides excellent TypeScript support with automatic type inference:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  permissions: string[];
}

// Optional mode
const [plugin1, getUser1] = createAuth<User>(async () => {
  // ... auth logic
});

const user1 = getUser1(); // Type: User | undefined
const name1 = getUser1()?.name; // Type: string | undefined

// Required mode
const [plugin2, getUser2] = createAuth<User>(
  async () => {
    // ... auth logic
  },
  { required: true }
);

const user2 = getUser2(); // Type: User (not nullable!)
const name2 = getUser2().name; // Type: string (no optional chaining needed)

// Using .required() method
const user3 = getUser1.required(); // Type: User (throws if not authenticated)
```

## Advanced Patterns

### Multiple Authentication Strategies

You can create multiple authentication strategies for different parts of your application:

```typescript
// JWT token authentication
export const [jwtPlugin, getJwtUser] = createAuth(async () => {
  const token = headers.get("authorization")?.replace("Bearer ", "");
  return await verifyJwtToken(token);
});

// API key authentication
export const [apiKeyPlugin, getApiClient] = createAuth(async () => {
  const apiKey = headers.get("x-api-key");
  return await Client.findByApiKey(apiKey);
});

// Session-based authentication
export const [sessionPlugin, getSessionUser] = createAuth(async () => {
  const sessionId = cookie.get("session_id");
  return await Session.getUser(sessionId);
});

// Use different strategies in different routes
app.register(jwtPlugin);
app.get("/api/users", () => {
  const user = getJwtUser();
  return { users: getUserList(user) };
});
```

### Combining with Other Context Data

Authentication works seamlessly with other context-based data:

```typescript
import { createContext } from "@minimajs/server";

const [getTenant, setTenant] = createContext<Tenant>();

const [authPlugin, getUser] = createAuth(async () => {
  const tenantId = headers.get("x-tenant-id");
  const tenant = await Tenant.findById(tenantId);
  setTenant(tenant);

  const token = headers.get("authorization");
  return await authenticateUser(token, tenant);
});

app.get("/data", () => {
  const user = getUser();
  const tenant = getTenant();
  return getData(tenant, user);
});
```

### Custom Error Messages

Customize error responses for different authentication failures:

```typescript
import { BaseHttpError } from "@minimajs/server/error";

class TokenExpiredError extends BaseHttpError {
  constructor() {
    super("Token has expired", 401);
  }
}

class InvalidTokenError extends BaseHttpError {
  constructor() {
    super("Invalid token format", 401);
  }
}

export const [authPlugin, getUser] = createAuth(async () => {
  const token = headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new UnauthorizedError("No token provided");
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    return await User.findById(decoded.userId);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
});
```

## Error Handling

The `createAuth` function handles errors intelligently:

- **`BaseHttpError`** (and subclasses like `UnauthorizedError`):

  - In **optional mode**: Error is stored, `resource()` returns `undefined`
  - In **required mode**: Error is thrown immediately when accessing the resource
  - `resource.required()` always throws the error

- **Other errors** (e.g., `Error`, network errors):
  - Always thrown immediately, resulting in 500 Internal Server Error

```typescript
const [authPlugin, getUser] = createAuth(async () => {
  const token = headers.get("authorization");

  if (!token) {
    throw new UnauthorizedError("Missing token"); // BaseHttpError
  }

  try {
    return await fetchUserFromDatabase(token);
  } catch (error) {
    // Database errors will throw immediately (500)
    throw error;
  }
});
```

## API Reference

### Error Classes

```typescript
import {
  UnauthorizedError, // 401
  ForbiddenError, // 403
  BaseHttpError, // Custom status codes
} from "@minimajs/auth";

// Usage
throw new UnauthorizedError("Invalid credentials");
throw new ForbiddenError("Insufficient permissions");
throw new BaseHttpError("Custom error", 418);
```

### Type Definitions

```typescript
// Auth callback type
type AuthCallback<T> = () => Promise<T> | T;

// Resource accessor for optional auth
interface AuthResourceOptional<T> {
  (): T | undefined;
  required(): T;
}

// Resource accessor for required auth
interface AuthResourceWithRequired<T> {
  (): T;
  required(): T;
}
```

## Best Practices

1. **Keep Authentication Logic Simple**: The callback should focus solely on authentication
2. **Use Type Parameters**: Always specify the user type for better TypeScript support
3. **Handle Errors Properly**: Throw `BaseHttpError` subclasses for expected failures
4. **Choose the Right Mode**: Use `required: true` for protected APIs, optional for mixed access
5. **Create Reusable Guards**: Extract common authorization logic into guard functions
6. **Separate Concerns**: Keep authentication separate from authorization logic

## Conclusion

The `@minimajs/auth` package provides a powerful, type-safe, and flexible authentication system for MinimaJS applications. With support for both optional and required authentication modes, combined with guards and interceptors, you can implement sophisticated authentication and authorization patterns while maintaining clean, readable code.
