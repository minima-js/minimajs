---
layout: home

hero:
  name: "Minima.js"
  text: Thoughtfully Designed for Modern Runtimes
  tagline: |
    Most frameworks optimize features.
    Minima.js optimizes how it feels to work every day.
  image:
    src: /logo.svg
    alt: Minima.js
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/minima-js/minimajs

features:
  - icon:
      src: /icon-lightning.svg
    title: Built from Scratch for Modern Runtimes
    details: "Not a legacy port. Designed ground-up for Bun and Node.js with native APIs, zero compatibility layers, zero historical baggage."
  - icon:
      src: /icon-function.svg
    title: File-Based Modules with True Isolation
    details: "Create users/module.ts, it auto-loads as /users/*. Each module is encapsulated—plugins only affect that module and its children. No sibling interference."
  - icon:
      src: /icon-context.svg
    title: Write Code That Reads Naturally
    details: "Call body() from anywhere. No req.body drilling. No context passing. Access request data like it's global—because it is (safely)."
  - icon:
      src: /icon-typescript.svg
    title: TypeScript works with you
    details: |
      APIs are designed for inference, so types flow naturally from usage. You write logic.
  - icon:
      src: /icon-globe.svg
    title: Web Standards, Zero Abstractions
    details: "Native Request/Response objects. Web standard APIs. Pure ESM. No framework-specific wrappers. Write portable, future-proof code."
  - icon:
      src: /icon-bun.svg
    title: 100% Bun-Native Compatible
    details: First-class Bun support with dedicated imports. Full Node.js compatibility. Same code, different runtime.
---

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
import { type Meta } from "@minimajs/server";
import { cors } from "@minimajs/server/plugins";

// Global config - applies to every route
export const meta: Meta = {
  prefix: "/api",
  plugins: [cors()],
};

// sync / async supported
export default async function (app) {
  app.get("/health", () => ({ status: "ok" }));
}
```

```typescript [src/users/module.ts]
// Auto-loaded as /api/users/*

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

export default function (app) {
  app.get("/list", getUsers);
  app.post("/create", createUser);
}
```

```typescript [src/posts/module.ts]
// Auto-loaded as /api/posts/*

function getLatestPosts() {
  return { posts: [] };
}
export default function (app) {
  app.get("/latest", getLatestPosts);
}
```

:::

**Your API is ready:**

- `GET /api/health` → `{"status":"ok"}`
- `GET /api/users/list` → `[{"id":1,"name":"Alice"}...]`
- `POST /api/users/create` → Creates user
- `GET /api/posts/latest` → `{"posts":[]}`

---

## Add Authentication in Seconds

Protected routes? Just add a plugin to `meta.plugins`:

::: code-group

```typescript [src/protected/module.ts]
import { type Meta } from "@minimajs/server";
import { authPlugin, guardPlugin, getUser } from "../auth/index.js";

export const meta: Meta = {
  plugins: [
    authPlugin, // Makes getUser() available
    guardPlugin, // Requires authentication
  ],
};

export default async function (app) {
  app.get("/profile", () => {
    const user = getUser(); // Guaranteed to exist (guard ensures it)
    return { user };
  });
}
```

:::

No decorators. No middleware chains. Just declare what you need.

[See full JWT authentication tutorial →](/cookbook/jwt-authentication)

---

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
import { type Meta } from "@minimajs/server";
import { hook } from "@minimajs/server";

// Users module - this hook ONLY affects /api/users/* routes
export const meta: Meta = {
  plugins: [hook("request", () => console.log("Users accessed"))],
};

export default async function (app) {
  app.get("/list", () => [
    /* users */
  ]);
}
```

```typescript [src/posts/module.ts]
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

export default async function (app) {
  app.get("/latest", getPosts);
}
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

### REST API with Auth

```
src/
├── module.ts           # Global auth, body parsing, CORS
├── auth/
│   └── module.ts       # POST /auth/login (public)
└── users/
    └── module.ts       # GET/POST /users/* (protected)
```

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Why Minima.js?</h2>
            <p class="details">
              Minima.js removes the friction you’ve learned to tolerate—slow feedback, noisy types, hidden lifecycles, and tangled modules—so building backends feels fast, clear, and predictable again.
            </p>
            <div style="height: 1rem;"></div>
            <a href="/getting-started" class="VPButton" role="button" style="background-color: var(--vp-c-brand-1); color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.25rem;">
              Get Started →
            </a>
          </article>
        </div>
      </div>
    </div>
  </div>
</div>

<div style="height: 2rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Join the Community</h2>
            <p class="details">
              Open source and community-driven. Report bugs, request features, or contribute code. We'd love your feedback.
            </p>
            <div style="height: 1rem;"></div>
            <a href="https://github.com/minima-js/minimajs" class="VPButton" role="button" style="background-color: var(--vp-c-brand-1); color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.25rem;">
              GitHub →
            </a>
          </article>
        </div>
      </div>
    </div>
  </div>
</div>
