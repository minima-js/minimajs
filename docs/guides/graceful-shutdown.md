---
title: Graceful Shutdown
---

# Graceful Shutdown in Minima.js

**Overview**

Minima.js provides a `gracefulShutdown` plugin for handling server termination in a controlled and predictable manner. This plugin ensures that all HTTP connections are properly terminated and resources are cleaned up before the process exits, preventing data loss or inconsistencies.

## Installation

The graceful shutdown plugin requires the `http-terminator` peer dependency:

```bash
npm install http-terminator
# or
yarn add http-terminator
# or
pnpm add http-terminator
```

## Basic Usage

```typescript
import { createApp } from "@minimajs/server";
import { gracefulShutdown } from "@minimajs/server/plugins";

const app = createApp();

// Register with default settings (SIGINT, SIGTERM)
app.register(gracefulShutdown());

app.listen({ port: 3000 });
```

## Key Features

- **Signal Handling:** Listens for process signals (default: `SIGINT`, `SIGTERM`) to initiate graceful shutdown
- **HTTP Connection Termination:** Uses `http-terminator` to gracefully close active HTTP connections
- **Timeout Protection:** Forces process exit if shutdown takes too long (default: 30 seconds)
- **Duplicate Prevention:** Prevents multiple simultaneous shutdown attempts
- **Detailed Logging:** Reports shutdown progress and duration

## Configuration Options

### Custom Signals

```typescript
app.register(gracefulShutdown({
  signals: ["SIGINT", "SIGTERM", "SIGUSR2"]
}));
```

### Custom Timeout

```typescript
app.register(gracefulShutdown({
  timeout: 10000  // 10 seconds
}));
```

### Full Configuration

```typescript
app.register(gracefulShutdown({
  signals: ["SIGINT", "SIGTERM"],
  timeout: 15000  // 15 seconds
}));
```

## Cleanup with Lifecycle Hooks

Use Fastify's `close` hook to perform cleanup operations during shutdown:

```typescript
import { createApp, hook } from "@minimajs/server";
import { gracefulShutdown } from "@minimajs/server/plugins";

const app = createApp();

// Register cleanup hooks
app.register(hook("close", async () => {
  await database.disconnect();
  console.log("Database disconnected");
}));

app.register(hook("close", async () => {
  await cache.clear();
  console.log("Cache cleared");
}));

// Register graceful shutdown
app.register(gracefulShutdown());

app.listen({ port: 3000 });
```

## How It Works

When a shutdown signal is received:

1. **Signal Detected:** The plugin intercepts the specified signal
2. **Prevent Duplicates:** Checks if shutdown is already in progress
3. **Timeout Set:** Starts a timeout timer to force exit if needed
4. **Terminate Connections:** Uses `http-terminator` to close active HTTP connections
5. **Close Fastify:** Calls `app.close()` which triggers all registered `close` hooks
6. **Log Duration:** Reports how long the shutdown took
7. **Process Exit:** Re-sends the signal to terminate the process

If shutdown exceeds the timeout, the process is forcefully exited with code 1.

## Best Practices

1. **Always install http-terminator:** It's a required peer dependency
2. **Use reasonable timeouts:** 30 seconds is usually sufficient, but adjust based on your workload
3. **Clean up resources:** Register `close` hooks for database connections, file handles, etc.
4. **Test shutdown behavior:** Ensure your application shuts down cleanly under load
5. **Monitor logs:** Check shutdown duration logs to identify potential issues

## Additional Resources

- [Node.js Signal Events](https://nodejs.org/api/process.html#signal-events)
- [http-terminator Documentation](https://www.npmjs.com/package/http-terminator)
- [Fastify Lifecycle Hooks](https://fastify.dev/docs/latest/Reference/Lifecycle/)
