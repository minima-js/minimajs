---
title: "Minima.js vs. The Crowd"
sidebar_position: 2
---

# Minima.js vs. Other Frameworks

Most framework comparisons are either hype or feature checklists.
This page answers one practical question:

**When is Minima.js the better choice for your team, and when is it not?**

## TL;DR

Choose **Minima.js** if you want:

- modern server runtime support (Node.js + Bun)
- Web API-first backend primitives (`Request`, `Response`, `File`)
- low-boilerplate modular architecture
- hook-driven composition instead of heavy framework ceremony

Do **not** choose Minima.js if you need:

- Edge-first deployment model (Cloudflare-style first)
- class/decorator-heavy enterprise patterns by default
- a very large legacy plugin ecosystem like Express

## What Minima.js Optimizes For

Minima.js is designed around server-side developer productivity with strong architecture defaults:

1. **Web-standard primitives** instead of framework-specific request/response wrappers.
2. **File-based module discovery** with explicit route maps.
3. **Context availability via AsyncLocalStorage** without prop-drilling request objects.
4. **Composable hooks/plugins** for lifecycle and cross-cutting concerns.

## Why Minima.js Feels Different In Practice

These are not marketing points; they directly change how codebases scale.

### 1. Pure ESM + Web-native APIs by default

Minima.js is aligned with modern runtime direction end-to-end:

- native ESM imports/exports
- first-class TypeScript + ESM workflows
- standard Web primitives (`Request`, `Response`, `Headers`, `File`) instead of custom wrappers
- no CommonJS compatibility tax in core architecture decisions

Practical impact:

- less ambiguity in build/runtime behavior (Node.js + Bun)
- easier onboarding for developers who know `fetch`
- less lock-in to framework-specific object APIs
- cleaner portability of helper logic

### 2. Encapsulated module tree (strong isolation boundaries)

Minima.js module composition is encapsulated by design. Parent/child boundaries help prevent accidental cross-module leakage of behavior.

Practical impact:

- hooks/plugins can be scoped intentionally
- route/module growth remains predictable
- fewer “global side-effects” surprises as teams add features

This is a major difference from typical ad-hoc middleware layering in Express apps, where global behavior often grows implicitly over time.

### 3. Auto module discovery with explicit route maps

Minima.js combines:

- filesystem-driven module discovery
- explicit `routes: Routes` declarations inside each module

That gives you both velocity and clarity: less registration boilerplate, but still obvious route ownership.

### 4. Hook system built for real application lifecycle

Minima.js hooks cover the full lifecycle (request flow, errors, startup/shutdown, response stages), with module-aware scoping.

Practical impact:

- cross-cutting behavior stays centralized and testable
- you can enforce policy by scope (global/module/route)
- operational concerns (resource connect/disconnect, graceful shutdown) are first-class

## Quick Comparison Matrix

| Dimension | Minima.js | Express | Fastify | NestJS | Hono |
|---|---|---|---|---|---|
| Runtime focus | Node.js + Bun servers | Node.js servers | Node.js servers | Node.js servers | Edge + multi-runtime |
| HTTP primitives | Web API (`Request`/`Response`) | Node req/res wrappers | Fastify req/reply wrappers | Framework abstractions | Web API style context |
| Module isolation | Encapsulated module tree | Mostly convention-based | Plugin encapsulation | Module + DI boundaries | App/router composition |
| Module discovery | Auto-discovery + explicit routes | Manual wiring | Manual wiring | CLI/decorator driven structure | Manual wiring |
| Lifecycle model | Multi-stage hooks + lifespan | Middleware-first | Hooks + lifecycle | Interceptors/guards/pipes | Middleware + handlers |
| Architecture style | Functional modules + hooks | Middleware chains | Plugin + schema-centric | DI + decorators + classes | Functional handlers |
| Boilerplate | Low | Low | Medium | High | Low |
| Best fit | Server APIs with clean modular growth | Legacy simplicity/ecosystem | High-throughput tuned APIs | Large enterprise org patterns | Edge-first apps |

## Minima.js vs Express

Express is proven and still widely used. But for modern TypeScript backends, teams often outgrow its patterns.

### Where Minima.js is stronger

- Pure ESM + TypeScript-first modern workflow.
- Built around async-first modern code paths.
- Uses standard Web APIs instead of legacy Node request/response ergonomics.
- Cleaner request-scoped access patterns without manually threading `req` everywhere.

### Where Express is stronger

- Largest ecosystem and historical community footprint.
- Easy fit for older codebases already centered on Express middleware.

**Pick Minima.js over Express when:**
You want a modern server foundation without carrying legacy ergonomics forward.

## Minima.js vs Fastify

Fastify is excellent for highly tuned Node APIs and has a strong performance culture.

### Where Minima.js is stronger

- Auto-discovery + module route ownership model improves structure at scale.
- Smaller conceptual surface for teams that value flow and readability.
- Web API-first developer model.
- File-based module structure that scales cleanly without extra registration overhead.

### Where Fastify is stronger

- Mature ecosystem for schema-driven optimization patterns.
- Better fit if your team is already deeply invested in Fastify plugins and conventions.

**Pick Minima.js over Fastify when:**
You care more about architecture clarity and low-ceremony development than maximizing framework-specific tuning knobs.

## Minima.js vs NestJS

NestJS is a full framework platform with strong opinions around classes, DI, and decorators.

### Where Minima.js is stronger

- Hook + module encapsulation model keeps cross-cutting concerns clean without deep class hierarchy.
- Lower abstraction tax: fewer framework-specific concepts to onboard.
- Function-first code style that stays close to plain TypeScript.
- Less ceremony for straightforward API modules.

### Where NestJS is stronger

- Fits organizations that explicitly prefer Angular-like architecture.
- Strong ecosystem around decorators, pipes, guards, and enterprise conventions.

**Pick Minima.js over NestJS when:**
You want scalable architecture without adopting a class/decorator-heavy programming model.

## Minima.js vs Hono

Hono is a strong choice for Edge-centric workloads.

### Where Minima.js is stronger

- Better default fit for long-running application servers on Node.js/Bun.
- Rich server-side patterns (module discovery, deep plugin lifecycle, file-heavy APIs).
- Pure ESM + Web API orientation without forcing Edge-first constraints.

### Where Hono is stronger

- Edge runtime footprint and deployment model.
- Great option when your primary target is Workers-style environments.

**Pick Minima.js over Hono when:**
Your core product runs as a server backend, not primarily at the Edge.

## Example: Request Access in Deep Helpers

::: code-group
```typescript [Minima.js]
import { request } from "@minimajs/server";

export function auditAction(action: string) {
  const req = request();
  const ip = req.headers.get("x-forwarded-for");
  console.log({ action, ip });
}
```

```typescript [Traditional req threading]
export function auditAction(req: RequestLike, action: string) {
  const ip = req.headers["x-forwarded-for"];
  console.log({ action, ip });
}

// Every caller must pass req manually
handler((req) => auditAction(req, "create_task"));
```
:::

## Decision Checklist

Choose **Minima.js** if most answers are “yes”:

- Do you want a pure ESM, Web-native API foundation on Node.js/Bun?
- Do you want less framework ceremony and clearer modules?
- Do you want strong module isolation boundaries as your codebase grows?
- Do you want auto module discovery without losing explicit route ownership?
- Do you want hooks/plugins for cross-cutting logic without class-heavy patterns?
- Do you want to scale codebase structure through modules instead of conventions spread across many file types?

If most answers are “no,” another framework may fit better for your constraints.
