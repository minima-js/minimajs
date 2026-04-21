---
title: Built-in Plugins
sidebar_position: 6
---

# Built-in Plugins

Minima.js comes with a set of pre-built plugins to handle common web development needs. These plugins can be easily integrated into your application:

- **In module files** - Use `meta.plugins` (recommended)
- **In entry files** - Use `app.register()`

## Quick Example

::: code-group

```typescript [src/module.ts]
import { type Meta, type Routes } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

// Apply CORS globally to all routes in this scope
export const meta: Meta = {
  plugins: [cors({ origin: "*" })],
};

function getData() {
  return { data: "value" };
}

export const routes: Routes = {
  "GET /api/data": getData,
};
```

:::

## Available Plugins

- **[Body Parser](./body-parser.md)**: For parsing incoming request bodies (e.g., JSON, text).
- **[CORS](./cors.md)**: For managing Cross-Origin Resource Sharing headers.
- **[Descriptor](./descriptor.md)**: For applying route metadata to entire scopes.
- **[Express Middleware](./express.md)**: For integrating Express.js-style middleware (Node.js only).
- **[Proxy](./proxy.md)**: For extracting client information from proxy headers (IP, protocol, hostname).
- **[Route Logger](./route-logger.md)**: A development utility to log all registered routes.
- **[Graceful Shutdown](./shutdown.md)**: For ensuring your server shuts down gracefully.
