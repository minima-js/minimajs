---
title: Getting Started
sidebar_position: 2
tags:
  - concepts
  - core
  - tutorial
---

# Getting Started with Minima.js

This guide takes you from zero to a running modular API using the Minima.js CLI.

## Prerequisites

- Bun `>=1.3` or Node.js `>=22`
- Basic TypeScript familiarity

## 1) Scaffold a Project

The fastest way to start is with `@minimajs/cli`:

::: code-group

```bash [Bun]
bunx @minimajs/cli new my-app --bun
cd my-app
```

```bash [Node.js]
npx @minimajs/cli new my-app
cd my-app
```

:::

This creates a fully configured project with TypeScript, a root module, and an `./app` runner script.

::: tip Use the `./app` runner
Every scaffolded project includes an executable `./app` script that wraps the CLI. You don't need a global install — the project always uses its own pinned version.
:::

## 2) Start the Dev Server

```bash
./app dev
```

Watch mode starts, TypeScript is compiled on save, and the server restarts automatically.

## 3) Understand File-Based Routing

Minima.js uses **file-based module discovery** — routes are defined in `module.ts` files, not registered imperatively with `app.get()`. The framework scans your `src/` directory and mounts each module automatically.

::: warning Prefer `module.ts` over imperative registration
Don't do this:
```typescript
// ❌ not the Minima.js way
app.get("/users", listUsers);
```
Do this instead — create `src/users/module.ts`:
```typescript
// ✅ file-based routing
export const routes: Routes = {
  "GET /list": listUsers,
};
```
The file's directory path becomes the URL prefix automatically.
:::

## 4) Add a Feature Module

Generate a module with the CLI:

```bash
./app add module users
```

This creates `src/users/module.ts`. Edit it to define your routes:

```typescript
import type { Routes } from "@minimajs/server";
import { params, body } from "@minimajs/server";

function listUsers() {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
}

function getUser() {
  const id = params.get("id");
  return { id, name: "Alice" };
}

function createUser() {
  const payload = body();
  return { created: payload };
}

export const routes: Routes = {
  "GET /list": listUsers,
  "GET /:id": getUser,
  "POST /create": createUser,
};
```

With the root module's `/api` prefix you now have:

- `GET /api/users/list`
- `GET /api/users/:id`
- `POST /api/users/create`

No registration needed — adding the file is enough.

## 5) Build for Production

```bash
./app build    # compile TypeScript → dist/
./app start    # run the compiled output
```

## 6) What You Just Used

- **File-based module discovery** — `module.ts` files are found and mounted automatically
- **Scoped module config** via `meta` (prefix, plugins, hooks)
- **Context helpers** (`params`, `body`) — no request object passed around
- **CLI scaffolding** — `add module`, `add service`, `add middleware` and more

## 7) Next Steps

- Learn module architecture: [Modules](/core-concepts/modules)
- Learn request helpers: [HTTP Guide](/guides/http)
- Learn hooks and lifecycle: [Hooks Guide](/guides/hooks)
- Explore all CLI commands: [CLI Reference](/packages/cli)
- Build a complete example: [Task Board Tutorial](/tutorials/task-board-api/)
