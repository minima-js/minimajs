---
title: Middleware
sidebar_position: 4
tags:
  - middleware
  - interceptor
---

# Middleware

Middleware functions are a powerful feature in Minima.js that allow you to execute code before your route handlers. They are commonly used for tasks like:

*   Authentication and authorization
*   Logging and metrics
*   Request parsing and validation
*   Adding data to the context

In Minima.js, middleware is handled by a function called `interceptor`.

## Creating Middleware

A middleware in Minima.js is an asynchronous function that can perform operations on the request and response.

Here's an example of a simple logger middleware:

```typescript title="src/middleware/logger.ts"
import { request } from '@minimajs/server';

export async function logger() {
  const req = request();
  console.log(`[${req.method}] ${req.url}`);
}
```

This middleware logs the HTTP method and URL of every incoming request.

## Registering Middleware

To use a middleware, you need to register it with your application or a specific module using the `interceptor` function.

### Global Middleware

You can register a middleware to be executed for every request in your application.

```typescript title="src/index.ts"
import { createApp, interceptor } from '@minimajs/server';
import { logger } from './middleware/logger';
import { homeModule } from './home';

const app = createApp();

const globalMiddleware = interceptor([logger]);

app.register(globalMiddleware(homeModule));

await app.listen({ port: 3000 });
```

### Module-Level Middleware

You can also apply middleware to a specific module.

```typescript title="src/user/index.ts"
import { type App, interceptor } from '@minimajs/server';
import { authMiddleware } from './middleware/auth';

async function userModule(app: App) {
  app.get('/', () => 'All users');
}

export const protectedUserModule = interceptor([authMiddleware], userModule);
```

Then, in your main application file:

```typescript title="src/index.ts"
import { createApp } from '@minimajs/server';
import { protectedUserModule } from './user';

const app = createApp();

app.register(protectedUserModule, { prefix: '/users' });

await app.listen({ port: 3000 });
```

Now, the `authMiddleware` will be executed for all routes defined in the `userModule`.

## Chaining Middleware

The `interceptor` function accepts an array of middleware, allowing you to chain them together. The middleware will be executed in the order they are defined in the array.

```typescript
import { interceptor } from '@minimajs/server';
import { logger } from './middleware/logger';
import { authMiddleware } from './middleware/auth';

const chainedMiddleware = interceptor([logger, authMiddleware]);
```

## Using Express Middleware

Minima.js is compatible with Express middleware. You can use your favorite Express middleware with the `interceptor` function.

```typescript
import { interceptor } from '@minimajs/server';
import * as cors from 'cors';

const corsMiddleware = cors();

const appModule = interceptor([corsMiddleware], mainModule);
```

This allows you to leverage the rich ecosystem of Express middleware in your Minima.js applications.