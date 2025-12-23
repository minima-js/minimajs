---
title: Third-Party Integration
sidebar_position: 9
---

# Effortless Third-Party Integration

One of the most powerful features of Minima.js's context system is how easily it allows you to integrate third-party libraries, even those that were not designed with a web framework in mind.

Because the request context is globally accessible within a request's lifecycle, you don't need to pass `req` or `res` objects to your third-party tools. You can simply call them, and they can access the context if needed.

Let's illustrate this with a practical example using the popular logging library, `pino`.

## The Goal

We want to create a request-specific logger that automatically includes a `traceId` in every log message generated during a request. This is invaluable for debugging and tracing requests through your system.

## The Implementation

**1. Create a Context for the Logger**

First, we'll create a context to hold our request-specific logger instance.

```typescript title="src/logger.ts"
import { createContext } from '@minimajs/server';
import pino, { type Logger } from 'pino';

// Create a base logger
const baseLogger = pino();

// Create a context to hold the request-specific logger
export const [getLogger, setLogger] = createContext<Logger>(baseLogger);
```

**2. Create a Middleware to Set Up the Logger**

Next, we'll create a middleware that runs for every request. This middleware will:
1.  Generate a unique `traceId`.
2.  Create a child logger from our base logger, binding the `traceId` to it.
3.  Set this new request-specific logger in the context.

```typescript title="src/middleware/logger.ts"
import { getLogger, setLogger } from '../logger';
import { randomUUID } from 'crypto';

export async function loggerMiddleware() {
  const traceId = randomUUID();
  const requestLogger = getLogger().child({ traceId });
  setLogger(requestLogger);
}
```

**3. Use the Logger Anywhere**

Now, any function called during the request can get the logger from the context and use it. The `traceId` will be automatically included in the logs.

Let's create a service that does some work and logs its progress.

```typescript title="src/service.ts"
import { getLogger } from './logger';

export function doSomethingImportant() {
  const logger = getLogger(); // Get the request-specific logger

  logger.info('Starting important work...');
  // ... do some work ...
  logger.info('Finished important work.');
}
```

Notice how `doSomethingImportant` has no idea it's running inside a web request. It doesn't need `req` or `res`. It just uses the logger it gets from the context.

**4. Put It All Together**

Finally, let's wire everything up in our main application file.

```typescript title="src/index.ts"
import { createApp, interceptor } from '@minimajs/server';
import { loggerMiddleware } from './middleware/logger';
import { doSomethingImportant } from './service';
import { getLogger } from './logger';

async function mainModule(app) {
  app.get('/', () => {
    const logger = getLogger();
    logger.info('Handling request for /');
    doSomethingImportant();
    return { message: 'Hello, World!' };
  });
}

const app = createApp();
const appModule = interceptor([loggerMiddleware], mainModule);
app.register(appModule);

await app.listen({ port: 3000 });
```

When you run this and hit the `/` endpoint, your console output will look something like this:

```json
{"level":30,"time":1678886400000,"pid":12345,"hostname":"your-machine","traceId":"...","msg":"Handling request for /"}
{"level":30,"time":1678886400001,"pid":12345,"hostname":"your-machine","traceId":"...","msg":"Starting important work..."}
{"level":30,"time":1678886400002,"pid":12345,"hostname":"your-machine","traceId":"...","msg":"Finished important work."}
```

As you can see, the `traceId` is automatically included in all log messages, making it easy to trace the flow of a single request. This is a powerful pattern that you can use for many different kinds of third-party integrations.
