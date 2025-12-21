---
title: Auth
sidebar_position: 2
---

# Authentication

```bash npm2yarn
npm i @minimajs/auth
```

# Interceptor and Authorization in MinimaJS

Interceptors and authorization play crucial roles in ensuring the security and integrity of your application. MinimaJS provides powerful tools for creating and utilizing interceptors, enabling you to implement authentication and authorization seamlessly. This documentation will guide you through the process of creating interceptors, applying them to routes, and implementing custom authorization guards.

## Creating Interceptors

Interceptors are middleware functions that intercept incoming requests before they reach the route handler. They are useful for performing tasks such as authentication, logging, or data transformation. Here's how you can create an interceptor for authentication using Minima.js:

```typescript title="src/auth/interceptor.ts"
import { createAuth, UnauthorizedError } from "@minimajs/auth";
import { headers } from "@minimajs/server";

export const [authMiddleware, guard, getUser] = createAuth(async () => {
  const token = headers.get("x-user-token");
  const user = await User.findByToken(token);
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }
  return user;
});
```

In this example, `createAuth` creates an interceptor for authentication. It expects a callback function that retrieves the user based on the provided token. If the user is not found or the credentials are invalid, it throws an `UnauthorizedError`.

## Using Interceptors

Once you've created the interceptor, you can apply it to routes within your application. Here's how you can use the interceptor in your application:

```typescript title="src/index.ts"
//
import { interceptor } from "@minimajs/server";
import { authMiddleware, getUser } from "./auth/interceptor";

function getHome() {
  const user: User | undefined = getUser();
  user && console.log(`Logged in as ${user.name}`);
}

// All routes inside this module will have access to authentication
function authenticatedModule(app: App) {
  app.get("/", getHome);
}

app.register(interceptor([authMiddleware], authenticatedModule));
```

In this example, `interceptor` is used to apply the `authMiddleware` to the `authenticatedModule`. This ensures that all routes within `authenticatedModule` require authentication. Even if the user is not authenticated, the route handler will still be called, with `null` as the user.

## Authorization Guards

Authorization guards allow you to protect routes based on specific conditions or permissions. MinimaJS provides a flexible mechanism for implementing guards. You can use the `guard` function returned from `createAuth` to define custom guards:

```typescript
// Applying a guard to protect the route
app.register(interceptor([authMiddleware, guard()], authenticatedModule));
```

You can customize guards further by specifying conditions or providing custom error messages:

```typescript
// Applying a custom guard with conditions and error message
app.register(
  interceptor([authMiddleware, guard((user) => user?.type === "admin", "Not authorized")], authenticatedModule)
);
```

Alternatively, you can create reusable guards for common scenarios:

```typescript title="src/auth/guards.ts"
export function admin() {
  return guard((user) => user.isAdmin, "Only admin users are allowed");
}

// Using a reusable guard
app.register(interceptor([authMiddleware, admin()], authenticatedModule));
```

You can also customize error messages within the guard itself:

```typescript title="src/auth/guards.ts"
export function admin() {
  return guard((user) => {
    if (!user) {
      throw new UnauthorizedError("User not logged in");
    }
    if (!user.isAdmin) {
      throw new UnauthorizedError("User is not authorized");
    }
  });
}

// Using a guard with custom error handling
app.register(interceptor([authMiddleware, admin()], authenticatedModule));
```

## Conclusion

Interceptors and authorization guards are powerful features provided by Minima.js for ensuring the security and integrity of your application. By creating custom interceptors and guards, you can implement robust authentication and authorization mechanisms tailored to your application's requirements. With Minima.js, protecting your routes and ensuring data security has never been easier.
