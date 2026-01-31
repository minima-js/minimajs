---
title: Modules
sidebar_position: 4
tags:
  - module
  - encapsulation
  - scope
---

# Building with File-Based Modules

Learn how to structure your Minima.js application using filesystem-based modules. By the end of this tutorial, you'll understand how to organize features into modules, scope plugins, and build scalable APIs using nothing but your file structure.

## What You'll Learn

- Creating your first auto-discovered module
- Adding plugins to modules with `meta.plugins`
- Building nested module hierarchies
- Setting up global configuration with a root module
- Customizing module discovery behavior

## Prerequisites

This tutorial assumes you have a basic Minima.js app with an entry point (`src/index.ts`). If not, see [Getting Started](/getting-started) first.

---

## Step 1: Create Your First Module

Let's start by creating a simple users module. Minima.js will automatically discover any file named `module.ts` in subdirectories.

**1. Create the directory structure:**

```
src/
├── index.ts
└── users/
    └── module.ts  # This will be auto-discovered
```

**2. Write your first module:**

::: code-group

```typescript [src/users/module.ts]
import type { App } from "@minimajs/server";

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

export default async function (app: App) {
  app.get("/list", () => users);
  app.get("/:id", ({ params }) => {
    return users.find((u) => u.id === Number(params.id));
  });
}
```

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers users/module.ts

await app.listen({ port: 3000 });
```

:::

**3. Test it:**

```bash
curl http://localhost:3000/users/list
# → [{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]

curl http://localhost:3000/users/1
# → {"id":1,"name":"Alice"}
```

🎉 **What just happened?**

- Minima.js found `users/module.ts` automatically
- The directory name (`users`) became the route prefix (`/users`)
- Your routes (`/list` and `/:id`) were mounted under `/users`

---

## Step 2: Add Plugins to Your Module

Now let's add some plugins to our users module - like request logging and CORS.

**1. Add the `meta` export with plugins:**

::: code-group

```typescript [src/users/module.ts]
import type { App, Meta } from "@minimajs/server";
import { hook } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

// Register plugins in meta.plugins
export const meta: Meta = {
  plugins: [
    cors(), // Enable cors for this module
    hook("request", ({ request }) => {
      console.log(`[Users] ${request.method} ${request.url}`);
    }),
  ],
};

export default async function (app: App) {
  app.get("/list", () => users);
  app.get("/:id", ({ params }) => {
    return users.find((u) => u.id === Number(params.id));
  });
}
```

:::

**2. Test the routes:**

```bash
curl http://localhost:3000/users/list
# → [{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]

# Check your server logs - you'll see the logging hook output
```

✨ **Key Concept:** Plugins in `meta.plugins` are **scoped to the module**. They only affect routes in this module, not others.

---

## Step 3: Create a Nested Module

Let's add a nested module for user profiles. This demonstrates how modules can be organized hierarchically.

**1. Create the nested structure:**

```
src/
├── index.ts
└── users/
    ├── module.ts
    └── profile/
        └── module.ts  # Nested module
```

**2. Create the nested module:**

::: code-group

```typescript [src/users/profile/module.ts]
import type { App } from "@minimajs/server";

export default async function (app: App) {
  app.get("/:userId", ({ params }) => {
    const userId = params.userId;
    return {
      userId,
      bio: "User profile for " + userId,
      settings: { theme: "dark" },
    };
  });
}
```

:::

**3. Test the nested route:**

```bash
curl http://localhost:3000/users/profile/1
# → {"userId":"1","bio":"User profile for 1",...}
```

📁 **Route Structure:**

- `src/users/module.ts` → `/users/*`
- `src/users/profile/module.ts` → `/users/profile/*`

The prefixes stack automatically!

---

## Step 4: Share Config with a Parent Module

What if you want multiple child modules to share plugins? Use a parent module.

**1. Restructure to use a parent:**

```
src/
├── index.ts
└── api/
    ├── module.ts       # Parent module
    ├── users/
    │   └── module.ts   # Child 1
    └── posts/
        └── module.ts   # Child 2
```

**2. Create the parent module with shared plugins:**

::: code-group

```typescript [src/api/module.ts]
import type { App, Meta } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

// These plugins apply to ALL child modules
export const meta: Meta = {
  prefix: "/api/v1",
  plugins: [cors({ origin: "*" })],
};

export default async function (app: App) {
  app.get("/health", () => ({ status: "ok" }));
}
```

```typescript [src/api/users/module.ts]
import type { App } from "@minimajs/server";

// No need to register cors - inherited from parent!
export default async function (app: App) {
  app.get("/list", () => ({ users: [] }));
}
```

```typescript [src/api/posts/module.ts]
import type { App } from "@minimajs/server";

// Also inherits CORS from parent
export default async function (app: App) {
  app.get("/list", () => ({ posts: [] }));
}
```

:::

**3. Check the resulting routes:**

- `GET /api/v1/health` (parent)
- `GET /api/v1/users/list` (child, with inherited plugins)
- `GET /api/v1/posts/list` (child, with inherited plugins)

🎯 **Inheritance:** Child modules automatically get their parent's prefix and plugins!

---

## Step 5: Set Up a Root Module (Global Config)

For truly global configuration that applies to **every module**, create a root module in your discovery root.

**1. Create a root module:**

```
src/
├── index.ts
├── module.ts        # ROOT module - applies to everything
├── users/
│   └── module.ts
└── posts/
    └── module.ts
```

**2. Add global plugins in the root module:**

::: code-group

```typescript [src/module.ts]
import type { App, Meta } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";
import { hook } from "@minimajs/server";

// 🌍 Global configuration - inherited by ALL modules
export const meta: Meta = {
  prefix: "/api",
  plugins: [
    cors({ origin: "*" }), // All routes get CORS
    hook("request", ({ request }) => {
      console.log(`[Global] ${request.method} ${request.url}`);
    }),
  ],
};

export default async function (app: App) {
  app.get("/health", () => ({ status: "ok" }));
}
```

:::

**3. Now every module gets these plugins automatically:**

::: code-group

```typescript [src/users/module.ts]
import type { App } from "@minimajs/server";

// No CORS here - inherited from root!
export default async function (app: App) {
  app.get("/list", () => ({ users: [] }));
}
```

:::

**Resulting structure:**

- `GET /api/health` (root)
- `GET /api/users/list` (inherits `/api` prefix + all plugins)
- `GET /api/posts/list` (inherits `/api` prefix + all plugins)

💡 **Best Practice:** Put authentication, CORS, rate limiting, and global logging in the root module.


## Common Patterns

### Pattern 1: API Versioning

```
src/
├── module.ts         # Root with global auth
├── v1/
│   ├── module.ts     # Prefix: /api/v1
│   ├── users/
│   │   └── module.ts
│   └── posts/
│       └── module.ts
└── v2/
    ├── module.ts     # Prefix: /api/v2
    └── users/
        └── module.ts
```

### Pattern 2: Public vs Protected Routes

::: code-group

```typescript [src/module.ts]
import { authPlugin } from "./plugins/auth.js";

// Root module - makes auth available everywhere
export const meta: Meta = {
  plugins: [authPlugin],
};
```

```typescript [src/public/module.ts]
// No guard - anyone can access
export default async function (app: App) {
  app.post("/login", () => {
    /* ... */
  });
}
```

```typescript [src/protected/module.ts]
import { guardPlugin } from "../plugins/guard.js";

// Add guard to require authentication
export const meta: Meta = {
  plugins: [guardPlugin],
};

export default async function (app: App) {
  app.get("/profile", () => {
    /* ... */
  });
}
```

:::

### Pattern 3: Feature-Based Organization

```
src/
├── auth/
│   ├── module.ts      # Login, logout, etc.
│   └── middleware/
│       └── guard.ts
├── users/
│   ├── module.ts      # User CRUD
│   └── profile/
│       └── module.ts  # User profiles
└── posts/
    ├── module.ts      # Post CRUD
    └── comments/
        └── module.ts  # Post comments
```

---

## Troubleshooting

### My module isn't being discovered

**Check:**

1. ✅ Is the file named `module.{ts,js,mjs}`?
2. ✅ Is it in a subdirectory of your entry point?
3. ✅ Is `moduleDiscovery` enabled? (It's on by default)

**Debug by logging discovered modules:**

```typescript
const app = createApp();
console.log("Checking module discovery...");
await app.ready();
```

### Plugins not working

**Remember:**

- `meta.plugins` only works in `module.ts` files (or your configured index filename)
- Plugins are scoped to the module and its children
- Parent modules' plugins are inherited by children

### Routes returning 404

**Check your prefix stacking:**

```
src/api/users/module.ts
└─> /api (from parent) + /users (from directory) = /api/users/*
```

Use absolute prefixes in `meta.prefix` to override:

```typescript
export const meta: Meta = {
  prefix: "/custom", // Overrides directory-based prefix
};
```

---

## Next Steps

Now that you understand modules, explore:

- **[Plugins](/core-concepts/plugins)** - Create reusable plugins for your modules
- **[Hooks](/guides/hooks)** - Learn all available lifecycle hooks
- **[JWT Authentication](/cookbook/jwt-authentication)** - Build a real auth system with modules

---

## Quick Reference

### File Naming

- Default: `module.{ts,js,mjs}`
- Advanced configuration: [Module Discovery](/advanced/module-discovery)

### Module Structure

```typescript
import type { App, Meta } from "@minimajs/server";

export const meta: Meta = {
  prefix: "/custom", // Optional: override directory name
  plugins: [
    /* ... */
  ], // Optional: module-scoped plugins
};

export default async function (app: App) {
  // Your routes here
}
```

### Module Types

- **Regular Module:** Any `module.ts` in a subdirectory
- **Root Module:** `module.ts` in the discovery root (global config)
- **Nested Module:** `module.ts` inside another module's directory

### Plugin Scope

- Root module plugins → Inherited by ALL modules
- Parent module plugins → Inherited by children
- Module plugins → Only that module
- Sibling modules → Isolated from each other
