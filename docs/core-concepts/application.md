# Application

The application instance is the heart of every Minima.js project. It's an object that encapsulates your server, routes, middleware, and configuration. You create it using the `createApp` function.

## Creating an Application

Minima.js is optimized for both Bun and Node.js. You create an application instance by importing `createApp` from the appropriate runtime-specific path. This ensures you get native performance with zero abstraction overhead.

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";

// Creates an app instance using Bun.serve()
const app = createApp();
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";

// Creates an app instance using http.createServer()
const app = createApp();
```

:::

If you import directly from `@minimajs/server`, it will default to the Node.js runtime.

## Application Lifecycle

The application instance manages the entire server lifecycle, which consists of several key stages: initialization, readiness, listening, and closing. You can tap into these stages using **lifecycle hooks** to manage resources, log events, or perform other setup and teardown actions.

For a detailed guide on hooks, see the [Hooks guide](/guides/hooks).

## Core Methods

The `app` object provides a small but powerful set of methods for managing your application.

### `app.listen()`

The `listen` method starts the web server, making it ready to accept incoming requests on a specified port and host. It returns an object containing the server's address.

```typescript
const { address } = await app.listen({ port: 3000 });
console.log(`Server running at ${address}`);
```

### `app.register()`

The `.register()` method adds functionality to your application. While modules are **auto-discovered** by default, this method is available for:

- Manual module registration (when `moduleDiscovery: false`)
- Registering global plugins in your entry file
- Building reusable plugins and libraries

**Note:** When using module discovery (recommended), use `meta.plugins` instead of calling `app.register()` inside modules.

::: code-group

```typescript [Recommended: Using modules with meta.plugins]
// src/users/module.ts
import { hook } from "@minimajs/server";

export const meta = {
  plugins: [
    hook("request", () => console.log("Users hook"))
  ]
};

export default async function(app) {
  app.get("/list", () => "users");
}
```

```typescript [Alternative: Manual registration]
// src/index.ts
import { type App, hook } from "@minimajs/server";

async function myModule(app: App) {
  app.register(hook("request", () => console.log("Module hook!")));
  app.get("/hello", () => "Hello from the module!");
}

const app = createApp({ moduleDiscovery: false });
app.register(myModule, { prefix: "/api" });
```

:::

This method is fundamental to Minima.js's principle of **encapsulation**. When you register a module, it creates an isolated scope, meaning any hooks or plugins registered inside it will not affect the rest of your application, ensuring clear boundaries and predictable behavior.

### `app.close()`

This method gracefully shuts down the server. It triggers the `close` lifecycle hook, allowing you to perform cleanup tasks like disconnecting from a database.

```typescript
// Example of a graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await app.close();
  console.log("Server closed.");
  process.exit(0);
});
```

### `app.handle()`

For testing purposes, the `.handle()` method allows you to send mock requests to your application without needing to run a live server. It dispatches the request directly to your handlers and returns a `Response` object.

```typescript
import { createRequest } from "@minimajs/server/mock";

test("GET /", async () => {
  const response = await app.handle(createRequest("/"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: "Hello, World!" });
});
```

For more information on testing your application, see the [Testing guide](/guides/testing).
