---
title: Context
sidebar_position: 3
tags:
  - context
  - async-local-storage
---

# Context: Access Data from Anywhere

In many Node.js frameworks, you need to pass `request` and `response` objects down through your application's layers. This "prop drilling" can lead to cluttered code and tight coupling.

Minima.js solves this with a powerful **Context** system, powered by Node.js's native `AsyncLocalStorage` API. This creates a unique "storage" for each request, making request-specific data accessible from **anywhere** in your code without passing `req` or `res` objects around.

## Creating and Using a Context

To create a context, use the `createContext` function from `@minimajs/server`.

```typescript
import { createContext } from "@minimajs/server";

// Create a context to store a request-specific trace ID
const [getTraceId, setTraceId] = createContext<string>("");
```

This returns a tuple with a **getter** (`getTraceId`) and a **setter** (`setTraceId`).

Here's how you might use it to apply a `traceId` to every request using a middleware plugin.

```typescript
import { createApp, compose, plugin, hook } from "@minimajs/server";
import { randomUUID } from "crypto";

// 1. Define the middleware as a plugin that registers a 'request' hook.
const traceIdPlugin = hook("request", () => {
  const traceId = randomUUID();
  setTraceId(traceId);
});

function someDeeplyNestedFunction() {
  // 3. We can access the trace ID here without any prop drilling!
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
// 2. Apply the middleware plugin to your app.
app.register(traceIdPlugin);

app.register(mainModule);
await app.listen({ port: 3000 });
```

As you can see, `someDeeplyNestedFunction` can access the `traceId` without having it passed as a parameter.

## Practical Example: Request-Scoped Logger with Pino

<!-- TODO: We already ships logger, change this example -->

The context system is perfect for integrating third-party libraries. Let's create a request-specific logger with `pino` that automatically includes a `traceId` in every log message.

### 1. Create a Context for the Logger

```typescript title="src/logger.ts"
import { createContext } from "@minimajs/server";
import pino, { type Logger } from "pino";

// Create a base logger
const baseLogger = pino();

// Create a context to hold the request-specific logger
export const [getLogger, setLogger] = createContext<Logger>(baseLogger);
```

### 2. Create a Middleware Plugin

Next, we'll create a middleware plugin that runs for every request.

```typescript title="src/middleware/logger.ts"
import { getLogger, setLogger } from "../logger";
import { randomUUID } from "crypto";
import { plugin, hook } from "@minimajs/server";

export const loggerPlugin = plugin(async (app) => {
  app.register(
    hook("request", () => {
      const traceId = randomUUID();
      const requestLogger = getLogger().child({ traceId });
      setLogger(requestLogger);
    })
  );
});
```

### 3. Use the Logger Anywhere

Now, any function called during the request can get the logger from the context.

```typescript title="src/service.ts"
import { getLogger } from "./logger";

export function doSomethingImportant() {
  const logger = getLogger(); // Get the request-specific logger
  logger.info("Starting important work...");
  // ... do some work ...
  logger.info("Finished important work.");
}
```

### 4. Put It All Together

Finally, let's wire everything up in our main application file.

```typescript title="src/index.ts"
import { createApp, compose } from "@minimajs/server";
import { loggerPlugin } from "./middleware/logger";
import { doSomethingImportant } from "./service";
import { getLogger } from "./logger";

async function mainModule(app) {
  app.get("/", () => {
    const logger = getLogger();
    logger.info("Handling request for /");
    doSomethingImportant();
    return { message: "Hello, World!" };
  });
}

const app = createApp();

// Apply the logger plugin to the main module
const withLogger = compose.create(loggerPlugin);
const appModule = withLogger(mainModule);
app.register(appModule);

await app.listen({ port: 3000 });
```

When you run this and hit the `/` endpoint, your console output will include the `traceId` in all log messages for that request.

## Benefits of Using Context

- **Cleaner Code:** Eliminates the need to pass `req` and `res` everywhere.
- **Decoupling:** Your business logic doesn't need to be aware of the underlying HTTP framework.
- **Easier Third-Party Integration:** Integrate libraries that don't have direct access to `req`/`res` objects.
- **Improved Testability:** Your functions become easier to test in isolation.
