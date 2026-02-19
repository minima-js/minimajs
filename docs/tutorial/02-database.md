---
title: "2. Database & Root Module"
---

# Step 2: Database & Root Module

## Database Module

Create `src/database.ts` — a single Prisma instance shared across the entire app, with a `hook.lifespan` that connects on startup and disconnects on shutdown:

```typescript
import { PrismaClient } from "@prisma/client";
import { hook } from "@minimajs/server";

export const prisma = new PrismaClient();

export const dbLifespan = hook.lifespan(async () => {
  await prisma.$connect();
  console.log("Database connected");

  return async () => {
    await prisma.$disconnect();
    console.log("Database disconnected");
  };
});
```

`hook.lifespan` runs the setup function when the app starts and the returned cleanup function when `app.close()` is called. This is the idiomatic way to manage resources in Minima.js.

## Root Module

The root module (`src/module.ts`) is the first module discovered. Anything registered here applies globally to every route in the app.

Create `src/module.ts`:

```typescript
import { type Meta } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";
import { gracefulShutdown } from "@minimajs/server/plugins";
import { dbLifespan } from "./database.js";

export const meta: Meta = {
  plugins: [
    // Database lifecycle
    dbLifespan,

    // Allow browser clients
    cors({
      origin: process.env.ALLOWED_ORIGIN ?? "*",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),

    // Graceful shutdown on SIGTERM / SIGINT
    gracefulShutdown(),
  ],
};
```

> **Why the root module?**
> `meta.plugins` registered here run for every request in every child module. CORS and the DB connection are app-wide concerns, so this is the right place for them.

## Request Logger

Add a request logger to the root module so every route is logged:

```typescript
import { type Meta, hook } from "@minimajs/server";
import { cors, gracefulShutdown } from "@minimajs/server/plugins";
import { openapi } from "@minimajs/openapi";
import { dbLifespan } from "./database.js";

export const meta: Meta = {
  plugins: [
    dbLifespan,
    cors({
      origin: process.env.ALLOWED_ORIGIN ?? "*",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    gracefulShutdown(),

    // Log every request
    hook("request", ({ request, pathname }) => {
      console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    }),

    // OpenAPI spec at GET /openapi.json
    openapi({
      info: {
        title: "Task Board API",
        version: "1.0.0",
        description: "A task management API built with Minima.js",
      },
      tags: [
        { name: "Auth", description: "Authentication and session management" },
        { name: "Workspaces", description: "Workspace management" },
        { name: "Boards", description: "Board management within workspaces" },
        { name: "Tasks", description: "Task management within boards" },
        { name: "Members", description: "Workspace membership and roles" },
      ],
    }),
  ],
};
```

## Verify

Run `npm run dev`. You should see:

```
Database connected
Task Board API running at http://localhost:3000
```

Every request will now be logged, CORS headers will be set, and the database will be cleanly disconnected when the process exits.

---

Next: [Authentication](./03-auth.md)
