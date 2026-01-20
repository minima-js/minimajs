---
title: Modules
sidebar_position: 4
tags:
  - module
  - encapsulation
  - scope
---

# Structuring Your Application with Modules

Modules are the recommended way to structure your Minima.js application. Instead of defining all your routes in one file, you organize your application into **filesystem-based modules** that Minima.js automatically discovers and loads.

## Quick Start: Filesystem-Based Modules

By default, Minima.js **automatically discovers modules** from directories adjacent to your entry file.

**Convention:** Files must be named `module.{ts,js,mjs}` for auto-discovery.

```
src/
├── index.ts          # Your entry point
├── users/
│   └── module.ts     # ✅ Automatically discovered
└── posts/
    └── module.ts     # ✅ Automatically discovered
    └── routes.ts     # ❌ Not discovered (wrong filename)
```

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server";

const app = createApp(); // Module discovery enabled by default!

await app.listen({ port: 3000 });
```

:::

That's it! Minima.js finds all `module.{ts,js,mjs}` files in subdirectories and loads them automatically.

**Your routes are ready:**
- `GET /users/*` (from `users/module.ts`)
- `GET /posts/*` (from `posts/module.ts`)

> **Custom filename:** Want to use `route.ts` or `index.ts` instead? See [Module Discovery Configuration](#module-discovery-configuration).

### Custom Discovery Root

If you prefer organizing modules in a specific directory:

```
src/
├── index.ts
└── api/              # Custom root
    ├── users/
    │   └── module.ts
    └── posts/
        └── module.ts
```

::: code-group

```typescript [src/index.ts]
const app = createApp({
  moduleDiscovery: { root: './api' }
});
```

:::

## Why Use Modules?

Filesystem-based modules provide:

- **Zero boilerplate:** No need to import and register every module
- **Convention over configuration:** Directory structure defines your app structure  
- **Automatic routing:** Module paths become route prefixes automatically
- **Encapsulation:** Each module has its own isolated scope
- **Scalability:** Easy to add new features by adding new directories
- **Team-friendly:** Multiple developers can work on different modules without conflicts

## Creating Your First Module

Create a module by adding a `module.ts` file in a directory:

::: code-group

```typescript [src/users/module.ts]
import type { App } from "@minimajs/server";

// Sample data
const users = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Doe" },
];

// Export module metadata (optional)
export const meta = {
  prefix: '/users', // This will be auto-generated from directory name if not specified
};

// Export default function - this is your module
export default async function(app: App) {
  app.get('/list', () => users);
  app.get('/:id', (req) => users.find(u => u.id === Number(req.params.id)));
}
```

:::

The directory name becomes the route prefix automatically:
- Module at `src/users/module.ts` → Routes at `/users/*`
- Route `/list` → Final path: `/users/list`
- Route `/:id` → Final path: `/users/:id`

## Module Configuration with `meta`

Use the exported `meta` object to configure your module:

::: code-group

```typescript [src/api/module.ts]
export const meta = {
  name: 'api',           // Module name (auto-generated from directory if omitted)
  prefix: '/api/v1',     // Custom prefix (defaults to /dirname)
  plugins: []            // Plugins to register in this module scope
};

export default async function(app: App) {
  // Your routes here
}
```

:::

## Registering Plugins in Modules

Use `meta.plugins` to register plugins that only affect the current module. This is the **recommended approach** as it's declarative and keeps your module function clean.

::: code-group

```typescript [src/admin/module.ts]
import { cors } from '@minimajs/server/plugins';
import { hook } from '@minimajs/server';

export const meta = {
  plugins: [
    cors({ origin: 'https://admin.example.com' }),
    hook('request', () => {
      console.log('Admin request');
    })
  ]
};

export default async function(app: App) {
  app.get('/dashboard', () => 'Admin Dashboard');
}
```

:::

**Why use `meta.plugins` instead of `app.register()`?**

::: code-group

```typescript [❌ Less clear - mixing concerns]
export default async function(app: App) {
  app.register(cors({ origin: '...' }));
  app.register(hook('request', ...));
  app.get('/route', ...);
}
```

```typescript [✅ Better - declarative and separated]
export const meta = {
  plugins: [cors(...), hook(...)]
};

export default async function(app: App) {
  app.get('/route', ...); // Only routes here
}
```

:::

### Module-Scoped Plugins

Plugins registered via `meta.plugins` are **scoped to the module** - they don't affect parent or sibling modules:

::: code-group

```typescript [src/api/module.ts]
import { bodyParser } from '@minimajs/server/plugins';
import { body } from '@minimajs/server';

export const meta = {
  prefix: '/api',
  plugins: [
    bodyParser({ types: ['json'] }) // Only parses JSON for /api/* routes
  ]
};

export default async function(app: App) {
  app.post('/data', () => {
    const data = body(); // bodyParser is available
    return { received: data };
  });
}
```

```typescript [src/public/module.ts]
import { body } from '@minimajs/server';

// No bodyParser plugin here

export default async function(app: App) {
  app.post('/webhook', () => {
    const data = body(); // ❌ bodyParser not available in this module
    return { ok: true };
  });
}
```

:::

## Nested Modules

Minima.js automatically discovers nested modules from your directory structure. Child modules inherit their parent's prefix:

```
src/
├── api/
│   ├── module.ts        # Parent module
│   ├── users/
│   │   └── module.ts    # Child module
│   └── posts/
│       └── module.ts    # Child module
```

::: code-group

```typescript [src/api/module.ts]
import { bodyParser } from '@minimajs/server/plugins';

export const meta = {
  prefix: '/api/v1',
  plugins: [
    bodyParser({ types: ['json'] }) // All children get body parsing
  ]
};

export default async function(app: App) {
  app.get('/status', () => ({ status: 'ok' }));
}
```

```typescript [src/api/users/module.ts]
import { params, body } from '@minimajs/server';

// No meta needed - auto-generated from directory name

export default async function(app: App) {
  app.get('/list', () => [/* users */]);
  
  app.post('/create', () => {
    const user = body(); // bodyParser from parent is available
    return { created: user };
  });
}
```

:::

**Resulting routes:**
- `GET /api/v1/status` (from `api/module.ts`)
- `GET /api/v1/users/list` (from `api/users/module.ts` - prefixes stack)
- `POST /api/v1/users/create`

### Root Module (Optional)

Create a `module.ts` in the discovery root to apply configuration to ALL modules:

```
src/
├── module.ts            # ROOT module (optional)
├── users/
│   └── module.ts        # Child of root
└── posts/
    └── module.ts        # Child of root
```

::: code-group

```typescript [src/module.ts]
import { bodyParser, cors } from '@minimajs/server/plugins';
import { hook } from '@minimajs/server';

export const meta = {
  prefix: '/api',
  plugins: [
    bodyParser({ types: ['json'] }),
    cors({ origin: '*' }),
    hook('request', ({ request }) => {
      console.log(`${request.method} ${request.url}`);
    })
  ]
};

export default async function(app: App) {
  app.get('/health', () => ({ status: 'ok' }));
}
```

:::

**Benefits:**
- All child modules get `/api` prefix
- All child modules get body parsing, CORS, and logging
- Centralized configuration for the entire API

**Resulting routes:**
- `GET /api/health`
- `GET /api/users/list` (inherits `/api` prefix)
- `GET /api/posts/list` (inherits `/api` prefix)

## Module Discovery Configuration

### Default Behavior

By default, Minima.js discovers modules from the **entry file's directory**:

::: code-group

```typescript [src/index.ts]
// Discovers modules from ./src/**/module.{ts,js,mjs}
const app = createApp();
```

:::

If your entry file is at `src/index.ts`, Minima.js scans:
- ✅ `src/users/module.ts`
- ✅ `src/posts/module.ts`
- ✅ `src/api/v1/users/module.ts` (nested modules)

### Basic Configuration

```typescript
// Disable module discovery (manual registration only)
const app = createApp({
  moduleDiscovery: false
});

// Custom root directory
const app = createApp({
  moduleDiscovery: { root: './modules' }
});

// Custom index filename
const app = createApp({
  moduleDiscovery: { index: 'route' }  // Look for route.ts instead of module.ts
});
```

### Advanced Configuration

All options are fully configurable:

```typescript
const app = createApp({
  moduleDiscovery: {
    root: './src/features',   // Directory to scan (default: entry file's directory)
    index: 'controller'       // Filename to look for (default: 'module')
  }
});
```

**Discovery pattern:** `{root}/*/{index}.{ts,js,mjs}`

With `root: './src/features'` and `index: 'controller'`:
- ✅ `src/features/users/controller.ts`
- ✅ `src/features/posts/controller.js`
- ✅ `src/features/api/v1/controller.mjs`
- ❌ `src/features/users/routes.ts` (wrong filename)
- ❌ `src/other/users/controller.ts` (wrong root)

### Real-World Examples

**Example 1: Next.js-style app directory**
```typescript
// Use 'route' files like Next.js
const app = createApp({
  moduleDiscovery: { 
    root: './app',
    index: 'route'
  }
});

// Discovers: app/users/route.ts, app/posts/route.ts
```

**Example 2: NestJS-style controllers**
```typescript
const app = createApp({
  moduleDiscovery: { 
    root: './src/controllers',
    index: 'controller'
  }
});

// Discovers: src/controllers/users/controller.ts
```

**Example 3: Laravel-style resources**
```typescript
const app = createApp({
  moduleDiscovery: { 
    root: './resources',
    index: 'routes'
  }
});

// Discovers: resources/api/routes.ts
```

**Example 4: Monorepo with multiple apps**
```typescript
const app = createApp({
  moduleDiscovery: { 
    root: './packages/api/modules'
  }
});

// Only scans that specific directory
```

### Complete Example

Here's a real-world example showing all features together:

```
src/
├── index.ts
├── module.ts              # Root module
├── users/
│   ├── module.ts
│   └── profile/
│       └── module.ts
└── posts/
    └── module.ts
```

::: code-group

```typescript [src/module.ts]
import { bodyParser, cors } from '@minimajs/server/plugins';

export const meta = {
  prefix: '/api/v1',
  plugins: [
    bodyParser(),
    cors({ origin: process.env.CORS_ORIGIN || '*' })
  ]
};

export default async function(app) {
  app.get('/health', () => ({ status: 'healthy', timestamp: Date.now() }));
}
```

```typescript [src/users/module.ts]
import { hook } from '@minimajs/server';
import { params, body } from '@minimajs/server';

export const meta = {
  plugins: [
    hook('request', () => {
      // Only logs for /api/v1/users/* routes
      console.log('Users module accessed');
    })
  ]
};

export default async function(app) {
  app.get('/list', () => getUsers());
  app.get('/:id', () => getUser(params.get('id')));
  app.post('/create', () => createUser(body()));
}
```

```typescript [src/users/profile/module.ts]
import { params } from '@minimajs/server';

// Inherits bodyParser and cors from root, and logging from parent

export default async function(app) {
  app.get('/', () => {
    const userId = params.get('id'); // From parent route
    return getUserProfile(userId);
  });
}
```

```typescript [src/index.ts]
import { createApp } from '@minimajs/server/bun';

const app = createApp(); // Auto-discovers from ./src

await app.listen({ port: 3000 });
```

:::

**Resulting API:**
- `GET /api/v1/health` (root module)
- `GET /api/v1/users/list` (users module)
- `GET /api/v1/users/:id` (users module)
- `POST /api/v1/users/create` (users module)
- `GET /api/v1/users/profile` (users/profile module)

**Plugin inheritance:**
- ✅ All routes get `bodyParser` and `cors` (from root)
- ✅ Only `/api/v1/users/*` routes get the logging hook
- ✅ Each module is isolated from siblings

## Manual Module Registration (Alternative)

If you prefer explicit control, you can disable auto-discovery and manually register modules:

::: code-group

```typescript [src/modules/users.ts]
import type { App } from "@minimajs/server";

export async function usersModule(app: App) {
  app.get('/users', () => [/* users */]);
}
```

```typescript [src/index.ts]
import { createApp } from "@minimajs/server";
import { usersModule } from "./modules/users";

const app = createApp({
  moduleDiscovery: false  // Disable auto-discovery
});

// Manually register modules
app.register(usersModule);
app.register(usersModule, { prefix: '/api/v1' }); // With custom prefix

await app.listen({ port: 3000 });
```

:::

**When to use manual registration:**
- Building a plugin/library for others to use
- Need dynamic module loading logic
- Prefer explicit imports over conventions

**When to use module discovery (recommended):**
- Building an application
- Want convention over configuration
- Need automatic routing from filesystem structure
- Working in a team with multiple developers

## Best Practices

1. **Use module discovery for applications** - It's simpler and scales better
2. **Use `meta.plugins` for module-specific plugins** - Keeps plugin scope clear
3. **One feature per module** - Each directory represents one feature/domain
4. **Nest related modules** - Group related features under parent modules
5. **Use meaningful directory names** - They become your route prefixes
