---
title: JWT Authentication
sidebar_position: 1
---

# JWT Authentication

This recipe will show you how to implement JWT-based authentication in your Minima.js application. We will use the `@minimajs/auth` package to create an authentication middleware and the `jsonwebtoken` library to generate and verify JWTs.

## Prerequisites

First, you need to install the required packages:

```bash
npm install @minimajs/auth jsonwebtoken
npm install -D @types/jsonwebtoken
```

## 1. Creating the Auth Middleware

The first step is to create an authentication middleware using the `createAuth` function from `@minimajs/auth`. This middleware will be responsible for verifying the JWT from the request headers and attaching the user to the context.

```typescript title="src/auth/middleware.ts"
import { createAuth, UnauthorizedError } from '@minimajs/auth';
import { headers } from '@minimajs/server';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-super-secret-key';

// A simple user type for demonstration
export interface User {
  id: number;
  username: string;
}

export const [authMiddleware, guard, getUser] = createAuth(async (): Promise<User | null> => {
  const authHeader = headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null; // No token, so no user
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    return { id: decoded.userId, username: decoded.username };
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
});
```

In this code:
*   We define a `User` interface.
*   We use `createAuth` to create the authentication middleware.
*   Inside the `createAuth` callback, we get the token from the `Authorization` header.
*   We verify the token using `jwt.verify()`.
*   If the token is valid, we return the user payload.
*   If the token is invalid, we throw an `UnauthorizedError`.

## 2. Generating Tokens

Next, we need a way to generate a JWT when a user logs in. Let's create a `login` route that generates a token for a user.

```typescript title="src/auth/routes.ts"
import { type App, body } from '@minimajs/server';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-super-secret-key';

// A mock user database
const users = [
  { id: 1, username: 'john.doe', password: 'password123' },
];

export async function authRoutes(app: App) {
  app.post('/login', () => {
    const { username, password } = body<{ username?: string; password?: string }>();

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '1h',
    });

    return { token };
  });
}
```

## 3. Protecting Routes

Now that we have our authentication middleware, we can use it to protect our routes. The `guard` function returned by `createAuth` can be used to ensure that only authenticated users can access certain routes.

Let's create a protected route that returns the current user's profile.

```typescript title="src/profile/routes.ts"
import { type App } from '@minimajs/server';
import { getUser, User } from '../auth/middleware';

export async function profileRoutes(app: App) {
  app.get('/profile', () => {
    const user = getUser();
    return { user };
  });
}
```

## 4. Putting It All Together

Finally, let's put everything together in our main application file.

```typescript title="src/index.ts"
import { createApp, interceptor } from '@minimajs/server';
import { authMiddleware, guard } from './auth/middleware';
import { authRoutes } from './auth/routes';
import { profileRoutes } from './profile/routes';

const app = createApp();

// Public routes (e.g., login)
app.register(authRoutes);

// Protected routes
const protectedRoutes = interceptor([authMiddleware, guard()], profileRoutes);
app.register(protectedRoutes);

await app.listen({ port: 3000 });
```

In this setup:
*   The `/login` route is public.
*   All routes defined in `profileRoutes` (i.e., `/profile`) are protected and require a valid JWT.

Now you have a fully functional JWT authentication system in your Minima.js application!
