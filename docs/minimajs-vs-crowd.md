---
title: "MinimaJS vs. The Crowd"
sidebar_position: 2
---

# MinimaJS vs. Other Frameworks

Choosing the right framework can be overwhelming. This guide compares MinimaJS with popular alternatives to help you understand what makes Minima.js fundamentally different.

## The Fundamental Difference

Most Node.js frameworks are built on top of other frameworks, creating layers of abstraction. **Minima.js is built from scratch**—no Express, no Fastify, no legacy dependencies. This architectural choice enables capabilities that simply aren't possible with wrapper-based frameworks.

## Minima.js vs Express

**Express**: The classic choice, battle-tested but showing its age.

| Feature | Minima.js | Express |
|---------|-----------|---------|
| **Architecture** | Built from scratch | Original Node.js framework (2010) |
| **Runtime Support** | Native Bun + Node.js | Node.js only |
| **Request/Response** | Web API standard | Node.js req/res objects |
| **TypeScript** | First-class, built-in | Third-party types |
| **Context** | AsyncLocalStorage-based | Manual prop drilling |
| **Middleware** | Hook-based with lifecycle control | Linear middleware chain |
| **Performance** | Zero overhead, native integration | Abstraction layer overhead |
| **Modern Features** | ESM-only, modern JavaScript | CommonJS legacy support |

**Why choose Minima.js over Express?**
- Express is 14+ years old and carries decades of legacy baggage
- Minima.js uses Web API standards (Request/Response) instead of Node.js-specific objects
- Native Bun support delivers 2-3x better performance
- No prop drilling—access request data from anywhere via context
- Hook system provides fine-grained lifecycle control

## Minima.js vs Fastify

**Fastify**: A faster Express alternative, but still built on legacy foundations.

| Feature | Minima.js | Fastify |
|---------|-----------|---------|
| **Architecture** | Built from scratch | Built on Node.js core |
| **Runtime Support** | Native Bun + Node.js | Node.js only |
| **Request/Response** | Web API standard | Node.js req/res wrappers |
| **TypeScript** | First-class, built-in | Partial support via plugins |
| **Context** | AsyncLocalStorage-based | Request decorators |
| **Middleware** | Hook-based with lifecycle control | Plugin system |
| **Schema Validation** | Optional, composable | Built-in (opinionated) |

**Why choose Minima.js over Fastify?**
- Fastify still wraps Node.js req/res objects—Minima.js uses Web API standards
- Native Bun support unlocks performance Fastify can't reach
- Simpler mental model: hooks are just functions, not plugins
- Context system eliminates request decorator boilerplate

## Minima.js vs NestJS

**NestJS**: Enterprise framework with heavy opinions.

| Feature | Minima.js | NestJS |
|---------|-----------|---------|
| **Architecture** | Built from scratch | Wrapper over Express/Fastify |
| **Runtime Support** | Native Bun + Node.js | Node.js only |
| **Request/Response** | Web API standard | Node.js req/res (inherited) |
| **TypeScript** | First-class, built-in | First-class, but heavyweight |
| **Paradigm** | Functional, minimal | OOP, decorators, DI |
| **Learning Curve** | Minimal | Steep (Angular-inspired) |
| **Bundle Size** | Lightweight | Heavy (full Angular-style DI) |

**Why choose Minima.js over NestJS?**
- NestJS is a wrapper over Express/Fastify—still inherits their limitations
- Minima.js uses functions, not classes and decorators
- No dependency injection complexity—just simple, pure functions
- 10x smaller bundle size and faster startup time
- Native Bun support for production workloads

## Minima.js vs Hono

**Hono**: Modern edge-first framework.

| Feature | Minima.js | Hono |
|---------|-----------|---------|
| **Architecture** | Built from scratch | Built for edge runtimes |
| **Runtime Support** | Native Bun + Node.js | Cloudflare Workers, Deno, Bun, Node.js |
| **Request/Response** | Web API standard | Web API standard |
| **Primary Use Case** | Full-stack applications | Edge computing |
| **Context** | AsyncLocalStorage-based | Context object (edge-compatible) |
| **Ecosystem** | Growing, Node.js-focused | Edge-focused |

**Why choose Minima.js over Hono?**
- Minima.js is optimized for full-stack applications, not just edge
- Better Node.js and Bun native integration
- AsyncLocalStorage context (not available in edge environments, but more powerful)
- Richer ecosystem for traditional server applications

**Why choose Hono over Minima.js?**
- If you're building for Cloudflare Workers or edge runtimes specifically
- Need cross-runtime compatibility beyond Node.js and Bun

## What Makes Minima.js Unique?

1. **Built from Scratch**: No legacy framework underneath. Every line of code serves modern use cases.

2. **Native Runtime Integration**:
   - `@minimajs/server/bun` for maximum Bun performance
   - `@minimajs/server/node` for Node.js compatibility
   - Same API, different runtimes, zero compromise

3. **Web API Standard**: Uses native Request/Response—portable, future-proof, zero learning curve if you know web standards.

4. **Revolutionary Hooks**: Control the request lifecycle with simple functions. No middleware chains, no plugins—just hooks.

5. **Context Everywhere**: AsyncLocalStorage-based context eliminates prop drilling. Access request data from anywhere without passing objects around.

6. **Function-First**: No classes, no decorators, no DI containers. Just pure functions and composability.

## The Bottom Line

Choose Minima.js if you want:
- Peak performance with Bun or Node.js
- Modern Web API standards instead of legacy abstractions
- Simple, functional code without framework magic
- Fine-grained control via hooks
- A framework built for 2025+, not 2010

Choose something else if you:
- Need edge runtime support (use Hono)
- Prefer class-based, Angular-style DI (use NestJS)
- Need maximum ecosystem compatibility (use Express/Fastify)

<!-- @include: ./comparison/nestjs.md -->
<!-- @include: ./comparison/express.md -->
