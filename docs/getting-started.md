---
title: Getting Started
sidebar_position: 2
tags:
  - concepts
  - core
  - tutorial
---

# Getting Started with Minima.js

This guide takes you from an empty folder to a working modular API.

## Prerequisites

- Bun `>=1.3` or Node.js `>=22`
- Basic TypeScript familiarity

## 1) Create Project

### Bun

```bash
mkdir minimajs-app
cd minimajs-app
bun init -y
bun add @minimajs/server
mkdir -p src/users
```

### Node.js

```bash
mkdir minimajs-app
cd minimajs-app
npm init -y
npm install @minimajs/server
npm install -D typescript tsc-watch @types/node
mkdir -p src/users
```

For Node.js, set ESM and scripts in `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsc-watch --onSuccess \"node dist/index.js\" --noClear"
  }
}
```

Minimal `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

If you already have a shared base config, keep it and only add the fields required for `outDir`, `rootDir`, and Node ESM module settings.

## 2) Create Entry Point

Create `src/index.ts`:

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";

const app = createApp();
await app.listen({ port: 3000 });

console.log("Listening on http://localhost:3000");
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";

const app = createApp();
await app.listen({ port: 3000 });

console.log("Listening on http://localhost:3000");
```

:::

## 3) Add Root Module

Create `src/module.ts`:

```typescript
import type { Meta, Routes } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

export const meta: Meta = {
  prefix: "/api",
  plugins: [cors()],
};

function health() {
  return { status: "ok" };
}

export const routes: Routes = {
  "GET /health": health,
};
```

Now `GET /api/health` should return `{"status":"ok"}`.

## 4) Add Feature Module

Create `src/users/module.ts`:

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

Now you have:

- `GET /api/health`
- `GET /api/users/list`
- `GET /api/users/:id`
- `POST /api/users/create`

## 5) Run

### Bun

```bash
bun --watch src/index.ts
```

### Node.js

```bash
npm run dev
```

For a production-style run:

```bash
npm run build
npm run start
```

If port `3000` is busy, change `listen({ port: 3000 })` in `src/index.ts`.

## 6) What You Just Used

- File-based module discovery (`module.ts` files)
- Scoped module config via `meta`
- Context helpers (`params`, `body`)
- Runtime-specific adapters (`/bun` and `/node`)

## 7) Next Steps

- Learn module architecture: [Modules](/core-concepts/modules)
- Learn request helpers: [HTTP Guide](/guides/http)
- Learn hooks and lifecycle: [Hooks Guide](/guides/hooks)
- Build a complete example: [Task Board Tutorial](/tutorials/task-board-api/)
