# @minimajs/server

A groundbreaking, high-performance HTTP framework for Node.js and Bun - designed for modern developers seeking efficiency, elegance, and speed.

[![npm version](https://img.shields.io/npm/v/@minimajs/server.svg)](https://www.npmjs.com/package/@minimajs/server)
[![License](https://img.shields.io/npm/l/@minimajs/server.svg)](https://github.com/minima-js/minimajs/blob/main/LICENSE)

## 🚀 Highlights

- **Dual Runtime Support**: Native integration with both Bun and Node.js - no abstraction overhead
- **100% TypeScript**: Built entirely in TypeScript for type safety and better DX
- **Web Standards First**: Uses native Web API Request/Response objects
- **Context-Aware**: Access request data anywhere with AsyncLocalStorage - no more prop drilling
- **Functional Approach**: Clean, composable APIs embracing functional programming
- **Zero Boilerplate**: Get started with minimal setup and configuration
- **ESM-Only**: Modern ECMAScript Modules with full async/await support
- **Powerful Plugin System**: Extend functionality with encapsulated, reusable plugins
- **Comprehensive Hooks**: Full control over request/response lifecycle

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

### Bun Runtime

```typescript
import { createApp } from "@minimajs/server/bun";
import { params, body } from "@minimajs/server";

const app = createApp();

// Simple route
app.get("/", () => ({ message: "Hello, World!" }));

// Route with parameters
app.get("/users/:id", () => {
  const id = params.get("id");
  return { userId: id };
});

// POST with body parsing
app.post("/users", () => {
  const userData = body<{ name: string; email: string }>();
  return { created: userData };
});

const { address } = await app.listen({ port: 3000 });
console.log("Server running on", address);
```

### Node.js Runtime

```typescript
import { createApp } from "@minimajs/server/node";
import { params, body } from "@minimajs/server";

const app = createApp();

app.get("/", () => ({ message: "Hello, World!" }));

app.get("/users/:id", () => {
  const id = params.get("id");
  return { userId: id };
});

app.post("/users", () => {
  const userData = body<{ name: string; email: string }>();
  return { created: userData };
});

const { address } = await app.listen({ port: 3000 });
console.log("Server running on", address);
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

### 3. Modular Architecture with Encapsulation

Build modular applications with powerful encapsulation - each registered function creates an isolated scope:

```typescript
import { createApp, hook, type App } from "@minimajs/server";

// User module - encapsulated scope
async function userModule(app: App) {
  // This hook only affects routes in THIS module
  app.register(
    hook("request", () => {
      console.log("User module request");
    })
  );

  app.get("/users", () => getUsers());
  app.get("/users/:id", () => getUser(params.get("id")));
}

// Admin module - separate encapsulated scope
async function adminModule(app: App) {
  // Different hooks - completely isolated from user module
  app.register(
    hook("request", () => {
      console.log("Admin module request");
    })
  );

  app.get("/admin", () => getAdminData());
  app.get("/admin/users", () => getAllUsers());
}

const app = createApp();

// Register modules - each gets its own isolated scope
app.register(userModule);
app.register(adminModule);

// Register with prefix for API versioning
app.register(userModule, { prefix: "/api/v1" });
// Routes: /api/v1/users, /api/v1/users/:id
```

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
  hook("request", ({ request, url }) => {
    console.log(`${request.method} ${url.pathname}`);
  })
);

app.register(
  hook("transform", (data, _ctx) => {
    return { ...data, timestamp: Date.now() };
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

- **Request Lifecycle**: `request`, `transform`, `send`, `error`, `errorSent`, `sent`, `timeout`
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

### Two Response Modes

**1. Automatic Serialization (Recommended)**

Return JavaScript values - they'll be serialized with hooks and global headers applied:

```typescript
app.get("/data", () => {
  headers.set("X-Custom-Header", "value");

  // Goes through: hooks → headers → serialization
  return { message: "Hello", timestamp: Date.now() };
});
```

**2. Direct Response (Bypass Everything)**

Return native Response to skip all hooks and processing for maximum performance:

```typescript
app.get("/stream", () => {
  // Bypasses: hooks, global headers, serialization
  return new Response("Raw response", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
});
```

## 🔌 Built-in Plugins

### Body Parser

```typescript
import { bodyParser } from "@minimajs/server/plugins";

app.register(
  bodyParser({
    types: ["json", "text", "form"],
    clone: false,
  })
);
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

Recommended project structure:

```
.
├── src
│   ├── index.ts           # Entry point
│   ├── user               # User module
│   │   ├── index.ts       # Module entry
│   │   ├── routes.ts      # Route handlers
│   │   └── service.ts     # Business logic
│   ├── auth               # Auth module
│   │   ├── index.ts
│   │   ├── middleware.ts
│   │   └── context.ts
│   └── shared             # Shared utilities
│       ├── plugins.ts
│       └── hooks.ts
├── package.json
└── tsconfig.json
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
