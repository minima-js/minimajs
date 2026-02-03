# @minimajs/server

A modern, high-performance HTTP framework for Node.js and Bun - combining proven routing and lifecycle libraries with a clean, TypeScript-first API designed for today's runtimes.

[![npm version](https://img.shields.io/npm/v/@minimajs/server.svg)](https://www.npmjs.com/package/@minimajs/server)
[![License](https://img.shields.io/npm/l/@minimajs/server.svg)](https://github.com/minima-js/minimajs/blob/main/LICENSE)

## 🚀 Highlights

- **File-Based Modules with True Isolation**: Create users/module.ts, it auto-loads as /users/\*. Each module is encapsulated.
- **Dual Runtime Support**: Native integration with both Bun and Node.js - no abstraction overhead
- **100% TypeScript**: Built entirely in TypeScript for type safety and better DX
- **Web Standards First**: Uses native Web API
- **Context-Aware**: Access request data anywhere with AsyncLocalStorage - no more prop drilling
- **Functional Approach**: Clean, composable APIs embracing functional programming
- **Zero Boilerplate**: Get started with minimal setup and configuration
- **ESM-Only**: Modern ECMAScript Modules with full async/await support
- **Powerful Plugin System**: Extend functionality with encapsulated, reusable plugins
- **Battle-Tested Core**: Built on proven libraries (find-my-way, avvio, pino) with a modern API layer

## 📦 Installation

**For Bun:**

```bash
bun add @minimajs/server
```

**For Node.js:**

```bash
npm install @minimajs/server
# or
yarn add @minimajs/server
```

## 🏁 Quick Start

### Filesystem-Based Modules (Recommended)

Organize your app by features - Minima.js automatically discovers modules.

**Convention:** Files must be named `module.{ts,js,mjs}`

```
src/
├── index.ts          # Entry point
├── users/
│   └── module.ts     # ✅ Auto-discovered
└── posts/
    └── module.ts     # ✅ Auto-discovered
```

```typescript [src/index.ts]
// src/index.ts

import { createApp } from "@minimajs/server/bun"; // or /node

const app = createApp(); // Discovers modules automatically!

await app.listen({ port: 3000 });
```

```typescript [src/users/module.ts]
// src/users/module.ts

import { params } from "@minimajs/server";

export default async function (app) {
  app.get("/list", () => [{ id: 1, name: "John" }]);

  app.get("/:id", () => {
    const id = params.get("id");
    return { id, name: "John" };
  });
}
```

Your routes are automatically available:

- `GET /users/list`
- `GET /users/:id`
- `GET /posts/list`

### Advanced: Custom Configuration

```typescript
const app = createApp({
  moduleDiscovery: {
    root: "./modules", // Custom directory (default: entry file's directory)
    index: "route", // Custom filename (default: 'module')
  },
});

// Or disable auto-discovery
const app = createApp({
  moduleDiscovery: false, // Manual registration only
});
```

## ✨ Key Features

### 1. Native Runtime Integration

Minima.js provides platform-specific imports that leverage native APIs for maximum performance:

```typescript
// Bun - uses Bun.serve()
import { createApp } from "@minimajs/server/bun";

// Node.js - uses http.createServer()
import { createApp } from "@minimajs/server/node";

// Default - node
import { createApp } from "@minimajs/server";
```

### 2. Context-Aware Request Handling

Access request data from anywhere without passing req/res objects:

```typescript
import { createApp } from "@minimajs/server/bun";
import { params, body, headers, request } from "@minimajs/server";

// Helper function that accesses context
function getCurrentUser() {
  const token = headers.get("authorization");
  return verifyToken(token);
}

app.get("/profile", () => {
  // No need to pass context around!
  const user = getCurrentUser();
  return { user };
});

app.post("/users/:id", () => {
  const id = params.get("id", Number); // With type conversion
  const data = body<UserData>(); // Type-safe body parsing
  const req = request(); // Native Web API Request

  return updateUser(id, data);
});
```

**Available Context Functions:**

- `request()` - Get native Web API Request object
- `response()` - Access response object
- `params()` / `params.get(key, parser?)` - Route parameters
- `body<T>()` - Parse request body with types
- `headers` - Access request/response headers
- `searchParams()` - Query string parameters
- `context()` - Full context object

<!-- TODO: Update the example -->

### 3. Filesystem-Based Modules with Auto-Discovery

Organize your application by features, and let Minima.js discover modules automatically:

```typescript [src/index.ts]
// src/index.ts

import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers from ./src

await app.listen({ port: 3000 });
```

```typescript [src/users/module.ts]
// src/users/module.ts

import { hook } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";
import { params } from "@minimajs/server";

// Module-scoped plugins via meta
export const meta = {
  plugins: [cors({ origin: "*" }), hook("request", () => console.log("User request"))],
};

// Module routes
export default async function (app) {
  app.get("/list", () => getUsers());
  app.get("/:id", () => getUser(params.get("id")));
}
```

```typescript [src/admin/module.ts]
// src/admin/module.ts

import { hook } from "@minimajs/server";

// Different plugins - completely isolated from users module
export const meta = {
  plugins: [hook("request", () => console.log("Admin request"))],
};

export default async function (app) {
  app.get("/dashboard", () => getAdminData());
}
```

Routes are automatically created:

- `GET /users/list`
- `GET /users/:id`
- `GET /admin/dashboard`

Each module is **completely isolated** - plugins and hooks in one module don't affect others.

### 4. Comprehensive Lifecycle Hooks

Control every stage of the request/response lifecycle:

**Manage Resource Lifecycle with `hook.lifespan`:**

```typescript
import { createApp, hook } from "@minimajs/server";

const app = createApp();

// Manage database connection lifecycle
app.register(
  hook.lifespan(async () => {
    // Runs when server starts
    await db.connect();
    console.log("Database connected");

    // Return cleanup function that runs when server stops
    return async () => {
      await db.disconnect();
      console.log("Database disconnected");
    };
  })
);
```

**Request/Response Hooks:**

```typescript
import { createApp, hook, abort } from "@minimajs/server";

const app = createApp();

// Request lifecycle hooks
app.register(
  hook("request", ({ request, pathname }) => {
    console.log(`${request.method} ${pathname}`);
  })
);

app.register(
  hook("transform", (data, _ctx) => {
    return { ...data, timestamp: Date.now() };
  })
);

app.register(
  hook("send", (response, _ctx) => {
    // Called after response is sent - useful for logging and cleanup
    console.log(`Response sent with status: ${response.status}`);
  })
);

app.register(
  hook("error", (error, _ctx) => {
    console.error("Request error:", error);
    if (abort.is(error)) {
      abort({ custom: error.message }, error.statusCode);
    }
    throw error;
  })
);
```

**Application lifecycle hooks:**

```ts
app.register(
  hook("ready", async () => {
    console.log("Server is ready!");
  })
);

app.register(
  hook("close", async () => {
    console.log("Server shutting down...");
  })
);
```

**Available Hooks:**

- **Request Lifecycle**: `request`, `transform`, `send`, `error`, `timeout`
- **Application Lifecycle**: `ready`, `listen`, `close`, `register`

### 5. Custom Context Values

Create and share request-scoped data:

```typescript
import { createContext } from "@minimajs/server";

// Create a context for the current user
const [getUser, setUser] = createContext<User | null>(null);

// Middleware to set user
async function authMiddleware() {
  const token = headers.get("authorization");
  const user = await verifyToken(token);
  setUser(user);
}

app.register(hook("request", authMiddleware));

// Access user in any route
app.get("/profile", () => {
  const user = getUser();
  if (!user) throw new UnauthorizedError();
  return { user };
});
```

## 📚 Core Concepts

### Web API Standard

Minima.js uses native Web API Request/Response objects instead of Node.js-specific abstractions:

```typescript
app.get("/info", () => {
  const req = request(); // Native Web API Request

  return {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers),
    userAgent: req.headers.get("user-agent"),
  };
});
```

## 🔌 Built-in Plugins

### Body Parser

Body parser is **enabled by default** and configured to parse JSON. You can override the configuration or disable it:

```typescript
import { bodyParser } from "@minimajs/server/plugins";

// Override configuration (supports multiple types)
app.register(
  bodyParser({
    type: ["json", "text", "form"],
    clone: false,
  })
);

// Or disable it entirely
app.register(bodyParser({ enabled: false }));
```

### Router Logger

```typescript
import { routerLogger } from "@minimajs/server/plugins";

app.register(routerLogger());
```

### CORS

```typescript
import { cors } from "@minimajs/server/plugins";

app.register(cors({ origin: "*", methods: ["GET", "POST"] }));
```

### Graceful Shutdown

```typescript
import { shutdown } from "@minimajs/server/plugins";

app.register(shutdown());
```

## 🧪 Testing

Minima.js provides mock utilities for testing:

```typescript
import { createApp } from "@minimajs/server/node";
import { createRequest } from "@minimajs/server/mock";

const app = createApp();

app.get("/", () => "Hello World");

const response = await app.handle(new Request("http://localhost")); // returns Native Response
// or
const response = await app.handle(createRequest("/", { method: "GET" })); // returns Native Response
expect(await response.text()).toBe("Hello World");
```

## 📖 Documentation

For comprehensive documentation, guides, and examples, visit:

**[https://minima-js.github.io/](https://minima-js.github.io/)**

### Quick Links

- [Getting Started](https://minima-js.github.io/getting-started)
- [Core Concepts](https://minima-js.github.io/core-concepts/architecture)
- [Routing Guide](https://minima-js.github.io/guides/routing)
- [Hooks Guide](https://minima-js.github.io/guides/hooks)
- [Plugin Development](https://minima-js.github.io/guides/plugin)
- [Error Handling](https://minima-js.github.io/guides/error-handling)
- [API Reference](https://minima-js.github.io/api/@minimajs/server)

## 🏗️ Project Structure

Recommended project structure with automatic module discovery:

```
.
├── src/
│   ├── index.ts              # Entry point
│   ├── module.ts             # Optional root module (defines /api prefix for all)
│   ├── users/
│   │   ├── module.ts         # Module entry (auto-loaded)
│   │   ├── service.ts        # Business logic
│   │   └── types.ts          # Type definitions
│   ├── posts/
│   │   ├── module.ts
│   │   └── service.ts
│   └── auth/
│       ├── module.ts
│       ├── middleware.ts
│       └── context.ts
├── package.json
└── tsconfig.json
```

```typescript [src/index.ts]
// src/index.ts

import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers modules from ./src

await app.listen({ port: 3000 });
```

```typescript [src/users/module.ts]
// src/users/module.ts

import type { App } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";
import { body } from "@minimajs/server";

// Register module-scoped plugins
export const meta = {
  plugins: [cors({ origin: "https://example.com" })],
};

// Define routes
export default async function (app: App) {
  app.get("/list", () => getUsers());
  app.post("/create", () => createUser(body()));
}
```

## 🔧 TypeScript Configuration

Ensure your `package.json` has ESM enabled:

```json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir=dist"
  }
}
```

Recommended `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  }
}
```

## 🚢 Deployment

### Using Bun

```bash
# Development
bun run src/index.ts
```

### Using Node.js with ebx [recommended]

```bash
# Install dependencies
npm install -D ebx

# Build
ebx src/index.ts

# Run
node dist/index.js
```

## 🤝 Related Packages

- [`@minimajs/auth`](https://www.npmjs.com/package/@minimajs/auth) - Authentication and authorization
- [`@minimajs/schema`](https://www.npmjs.com/package/@minimajs/schema) - Data validation with Zod
- [`@minimajs/cookie`](https://www.npmjs.com/package/@minimajs/cookie) - Cookie parsing and signing
- [`@minimajs/multipart`](https://www.npmjs.com/package/@minimajs/multipart) - File upload handling

## 📄 License

MIT © [Minima.js](https://github.com/minima-js/minimajs)

## 🙏 Credits

Built on top of excellent libraries:

- [avvio](https://github.com/fastify/avvio) - Boot lifecycle management
- [find-my-way](https://github.com/delvedor/find-my-way) - Fast HTTP router
- [pino](https://github.com/pinojs/pino) - High-performance logging

---

**Made with ❤️ for the modern web**

See the full documentation at [minima-js.github.io](https://minima-js.github.io/)
