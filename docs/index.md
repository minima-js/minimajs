---
layout: home

hero:
  name: "Minima.js"
  text: Backend Framework for Bun and Node.js
  tagline: |
    Build APIs with Web standards, file-based modules,
    and context-aware helpers that reduce boilerplate.
  image:
    src: /logo.svg
    alt: Minima.js
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Introduction
      link: /intro

features:
  - icon:
      src: /icon-globe.svg
    title: Web Standards First
    details: "Use Request, Response, File, Blob, URL, and ReadableStream directly. Less framework-specific code, easier portability."

  - icon:
      src: /icon-bun.svg
    title: Runtime-Native
    details: "Use Bun or Node by changing one import path. No legacy compatibility layer."

  - icon:
      src: /icon-function.svg
    title: File-Based Modules
    details: "Your folder structure becomes your route structure. Create module files and they are auto-discovered."

  - icon:
      src: /icon-context.svg
    title: Context Helpers
    details: "Access params, headers, body, and search params anywhere in request scope without passing req/res through every function."

  - icon:
      src: /icon-hook.svg
    title: Scoped Plugins and Hooks
    details: "Apply behavior per module or globally with predictable inheritance and isolation."

  - icon:
      src: /icon-lightning.svg
    title: Zero-Config CLI
    details: "One ./app script scaffolds a TypeScript-ready project, builds, runs, and manages packages. Node.js version and package manager are auto-detected — nothing to set up."
---

## Try It Now

::: code-group

```bash [Bun]
bunx @minimajs/cli new my-app && cd my-app && ./app dev
```

```bash [Node.js]
npx @minimajs/cli new my-app && cd my-app && ./app dev
```

:::

That's it — a scaffolded project with TypeScript, file-based routing, and a running dev server.

## One Script to Run Everything

Every scaffolded project gets a `./app` runner — a single executable that wraps your runtime, package manager, and the Minima.js CLI. No global installs, no version mismatches.

::: code-group

```bash [Develop]
./app dev              # watch mode with TypeScript checking
./app dev --no-check   # skip type checking for speed
```

```bash [Build & Run]
./app build            # production build via esbuild
./app start            # run compiled output
```

```bash [Packages]
./app sync             # reproducible install from lockfile
./app i zod            # add a package
./app un lodash        # remove a package
```

```bash [Generate]
./app add module orders          # scaffold a route module
./app add module orders --crud   # full CRUD (handler + repository)
./app add middleware auth
./app add plugin rate-limit
./app add openapi
./app add dockerfile
```

:::

The correct Node.js version and package manager are picked up automatically — no `nvm use`, no `corepack enable` needed.

[See the full CLI reference →](/cli/)

## Start Here

- New to Minima.js: read [Introduction](/intro)
- Ready to run code: follow [Getting Started](/getting-started)
- Want a full app walkthrough: open [Task Board Tutorial](/tutorials/task-board-api/)

## How It Feels to Build

Watch how little code you need to write. Notice what you DON'T see—no imports, no registration, no wiring.

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";
// import { createApp } from "@minimajs/server/node"; // for node

const app = createApp();
await app.listen({ port: 3000 });
// That's your entire entry point
```

```typescript [src/module.ts]
import type { Meta, Routes } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

// Global config - applies to every route
export const meta: Meta = {
  prefix: "/api",
  plugins: [cors()],
};

function getHealth() {
  return { status: "ok" };
}

export const routes: Routes = {
  "GET /health": getHealth,
};
```

```typescript [src/users/module.ts]
// Auto-loaded as /api/users/*

import type { Routes } from "@minimajs/server";
import { body } from "@minimajs/server";

function getUsers() {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
}

function createUser() {
  const user = body();
  return { created: user };
}

export const routes: Routes = {
  "GET /list": getUsers,
  "POST /create": createUser,
};
```

```typescript [src/posts/module.ts]
// Auto-loaded as /api/posts/*

import type { Routes } from "@minimajs/server";

function getLatestPosts() {
  return { posts: [] };
}

export const routes: Routes = {
  "GET /latest": getLatestPosts,
};
```

:::

**Your API is ready:**

- `GET /api/health` → `{"status":"ok"}`
- `GET /api/users/list` → `[{"id":1,"name":"Alice"}...]`
- `POST /api/users/create` → Creates user
- `GET /api/posts/latest` → `{"posts":[]}`

<br />
<p style="font-size: 1.35rem; line-height: 1.35; margin: 0 0 1rem;">
Most frameworks optimize features.<br>
Minima.js optimizes how it feels to work every day.
</p>

## Handle File Uploads with Native File API

Upload handling with `@minimajs/multipart` gives you native `File` instances—no custom wrappers, no learning curve.

::: code-group

```typescript [src/uploads/module.ts]
import type { Routes } from "@minimajs/server";
import { multipart, helpers } from "@minimajs/multipart";

export async function uploadAvatar() {
  // Returns native File instance - holds data in memory
  const avatar = await multipart.file("avatar");

  // Or use streaming without memory overhead
  // const avatar = streaming.file("avatar");

  // Move file to destination
  await helpers.save(avatar, "./uploads/avatars");

  // File is a valid Response - renders with correct content-type
  return avatar;
}

export const routes: Routes = {
  "POST /avatar": uploadAvatar,
};
```

:::

**What you get:**

- Native `File` instances (Web Standards API)
- `multipart.file()` reads entire file into memory
- `File` works as Response automatically
- Use `@minimajs/multipart/schema` Zod guards your uploads, disk handles the weight

[See multipart documentation →](/packages/multipart/)

## True Module Encapsulation

Each module creates an isolated scope. Plugins, hooks, and configuration stay contained—no accidental global state, no sibling interference.

::: code-group

```typescript [src/module.ts]
import { type Meta } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

// Root module - these plugins apply to ALL children
export const meta: Meta = {
  prefix: "/api",
  plugins: [cors()],
};
```

```typescript [src/users/module.ts]
import type { Meta, Routes } from "@minimajs/server";
import { hook } from "@minimajs/server";

// Users module - this hook ONLY affects /api/users/* routes
export const meta: Meta = {
  plugins: [hook("request", () => console.log("Users accessed"))],
};

function listUsers() {
  return [
    /* users */
  ];
}

export const routes: Routes = {
  "GET /list": listUsers,
};
```

```typescript [src/posts/module.ts]
import type { Routes } from "@minimajs/server";
import { searchParams } from "@minimajs/server";
// Posts module - no logging hook here
// Completely isolated from users module

function getPosts() {
  // contexts will be available everywhere
  const page = searchParams.get("page", Number); // cast page to number
  return {
    page,
    data: [], // posts
  };
}

export const routes: Routes = {
  "GET /latest": getPosts,
};
```

:::

**How it works:**

- ✅ Root module plugins → Inherited by all children
- ✅ Parent module plugins → Inherited by their children only
- ✅ Sibling modules → Completely isolated from each other
- ✅ Child can override or extend parent behavior
- ✅ No global state pollution

**Request to `/api/users/list`:**

```
→ Root plugins run (cors)
→ Users plugins run (logging hook)
→ Route handler executes
```

**Request to `/api/posts/latest`:**

```
→ Root plugins run (cors)
→ Route handler executes
✅ Users logging hook DOES NOT run (isolated)
```

## Build Next

Choose the path that matches what you need right now:

- Learn architecture deeply: [Core Concepts](/core-concepts/architecture)
- Build a complete API: [Task Board Tutorial](/tutorials/task-board-api/)
- Add auth quickly: [JWT Authentication](/cookbook/jwt-authentication)
- Work with uploads: [Multipart Package](/packages/multipart/)
- Explore all packages: [Packages](/packages/auth)

## Community

Minima.js is open-source and community-driven.

- GitHub: [minima-js/minimajs](https://github.com/minima-js/minimajs)
- Report bugs or request features: [Open an issue](https://github.com/minima-js/minimajs/issues)
- Contribute docs or code: [Contribution opportunities](https://github.com/minima-js/minimajs/pulls)

If you are evaluating frameworks right now, start with [Getting Started](/getting-started) and build one real route module before deciding.
