# Graceful Shutdown

The Graceful Shutdown plugin ensures that your server shuts down cleanly and predictably. It listens for process termination signals (`SIGINT` and `SIGTERM`) and, upon receiving one, instructs the Minima.js application to run its shutdown procedure via `app.close()`.

This allows your application to finish processing active requests, close database connections, and run any other cleanup logic defined in `close` hooks before the process exits.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { shutdown } from "@minimajs/server/plugins";
```

## Usage

Register the plugin within your root module's `meta.plugins`. It requires no default configuration.

::: code-group

```typescript [src/module.ts]
import { shutdown } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

// Enable graceful shutdown globally
export const meta: Meta = {
  plugins: [shutdown()],
};
```

:::

With the plugin registered, pressing `Ctrl+C` in your terminal will now trigger the graceful shutdown process instead of immediately terminating the application.

## Configuration

You can customize the shutdown behavior in your root module:

### `signals`

An array of process signals to listen for.

- **Type**: `Signals[]` (e.g., `'SIGINT'`, `'SIGTERM'`)
- **Default**: `['SIGINT', 'SIGTERM']`

### `timeout`

The maximum time in milliseconds to wait for the graceful shutdown to complete before forcefully terminating the process. This prevents your application from hanging indefinitely during shutdown.

- **Type**: `number`
- **Default**: `30000` (30 seconds)

**Example with custom options:**

::: code-group

```typescript [src/module.ts]
import { shutdown } from "@minimajs/server/plugins";
import { type Meta } from "@minimajs/server";

export const meta: Meta = {
  plugins: [
    shutdown({
      signals: ["SIGINT"], // Only listen for SIGINT
      timeout: 10000, // Wait a maximum of 10 seconds
    }),
  ],
};
```

:::
