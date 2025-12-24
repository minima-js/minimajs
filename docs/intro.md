---
slug: /
sidebar_position: 1
title: "Introduction"
---

# What is Minima.js?

Minima.js is a modern Node.js framework that reimagines how web applications should be built. It's designed for developers who want to write less code, ship faster, and maintain cleaner codebases.

## The Impact

### Best-in-Class Developer Experience

Minima.js offers the best TypeScript DX you'll find in any Node.js framework. Every API is fully typed, autocomplete works everywhere, and your editor becomes a powerful assistant that catches bugs before you even run your code.

### No Magic, Just TypeScript

Unlike other frameworks that rely on decorators, reflection, or runtime metadata, Minima.js is pure TypeScript. What you see is what you get. No hidden magic, no complex build steps, no guessing what's happening behind the scenes.

### Everything is Composable

Build your application like Lego blocks. Middleware, plugins, handlers - everything follows functional composition patterns. Reuse code across projects, combine behaviors effortlessly, and test each piece in isolation.

### Integration Made Simple

Adding third-party libraries feels natural. No adapters, no wrappers, no fighting with `req`/`res` objects. The context system means any library can access request data without being explicitly passed down through your call stack.

### Build Extensions in Minutes

Creating plugins and extensions is remarkably simple. The functional API means you can create reusable utilities without learning complex plugin systems or framework internals.

## Quick Example

```typescript
import { createApp, params } from "@minimajs/server";

const app = createApp();

app.get("/:name", () => `Hello, ${params.get("name")}!`);

await app.listen({ port: 3000 });
```

That's it. No classes, no decorators, no boilerplate. Just pure, simple code.

## What This Means for You

**Faster Development**
Write less code, iterate faster, and ship features in hours instead of days.

**Fewer Bugs**
TypeScript catches errors at compile time. No more runtime surprises in production.

**Easier Maintenance**
Six months later, your code still makes sense. No magic to reverse-engineer.

**Better Testing**
Pure functions are easy to test. No mocking frameworks, no complex test setup.

**Happier Teams**
Clean code patterns mean faster onboarding and fewer debates about "the right way."

## Who Should Use Minima.js?

Minima.js is perfect for developers and teams who:

- Value code clarity over clever abstractions
- Want TypeScript that actually helps instead of fights
- Prefer functional patterns over object-oriented complexity
- Build APIs, microservices, or backend services
- Care about long-term maintainability

If you've ever felt frustrated by framework magic, bloated APIs, or poor TypeScript support - Minima.js was built for you.
