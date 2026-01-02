---
slug: /
sidebar_position: 1
title: "Introduction"
---

# Minima\.js: Engineered from Scratch for the Modern Web

Minima.js is a high-performance web framework built entirely from the ground up—not a wrapper, not an abstraction layer, but a purpose-built solution for modern JavaScript runtimes.

## The Minima.js Difference

Unlike frameworks that layer abstraction upon abstraction, Minima.js takes a fundamentally different approach: **built from scratch with zero legacy baggage**. This means every line of code serves a purpose, and nothing stands between you and peak performance.

**Core Philosophy:**

- **Built from Scratch, Not a Wrapper:** Minima.js is engineered from first principles. No dependencies on Fastify, Express, or any legacy framework. Just pure, optimized code designed for modern runtimes.

- **100% Bun-Native Support:** First-class support for Bun with dedicated `@minimajs/server/bun` imports that leverage Bun's native HTTP server for maximum performance. Node.js support via `@minimajs/server/node` ensures compatibility across all environments.

- **Web API Standard at the Core:** Uses native `Request` and `Response` objects from the Web API standard. No custom wrappers, no proprietary abstractions—just standardized APIs that work everywhere.

- **Revolutionary Hook System:** Control every aspect of the request lifecycle with an intuitive, function-based hook system. Intercept, transform, and manage requests at any stage with simple, composable functions.

- **Context-Aware Architecture:** Say goodbye to prop drilling! AsyncLocalStorage-based context lets you access request data from anywhere in your code without passing `req` and `res` objects around.

- **Function-First Philosophy:** Pure functional approach with minimal boilerplate. Build modular applications using plain async functions and composable plugins—no classes, no decorators, just functions.

- **TypeScript First:** Built entirely in TypeScript, for TypeScript. Exceptional type safety, autocompletion, and developer experience out of the box.

## Why Start from Scratch?

Building from scratch wasn't a choice—it was a necessity. Existing frameworks carry decades of compatibility requirements, outdated patterns, and performance compromises. By starting fresh, Minima.js delivers:

- **Zero Legacy Overhead:** No backward compatibility baggage. Every feature is designed for modern JavaScript.
- **Native Runtime Integration:** Direct integration with Bun's native APIs and Node.js internals—no middleware layers slowing you down.
- **Web Standards First:** By using standard Request/Response objects, your code is portable and future-proof.
- **Surgical Performance:** Every millisecond matters. Built from scratch means optimized hot paths and zero unnecessary abstractions.

## The Hook-Based Advantage

Minima.js introduces a unique approach to request lifecycle management through **hooks**. Unlike traditional middleware that executes in a rigid chain, hooks give you fine-grained control:

```typescript
import { createApp } from '@minimajs/server/bun';
import { hook } from '@minimajs/server';

const app = createApp();

// Hooks receive context - destructure what you need
app.register(hook('request', ({ request }) => {
  console.log(`${request.method} ${request.url}`);
}));

app.register(hook('error', (ctx) => {
  // Custom error handling with full control
  return { error: ctx.error.message, code: 500 };
}));

app.get('/', () => ({ message: 'Hello, World!' }));
```

**Two ways to access request data:**

```typescript
import { params, request } from '@minimajs/server';

// 1. Via Context parameter (explicit)
app.get('/:id', (ctx) => {
  const id = ctx.route.params.id;
  return { id };
});

// 2. Via AsyncLocalStorage imports (recommended - cleaner)
app.get('/:id', () => {
  const id = params.get('id');
  const url = request().url; // Native Web API Request
  return { id, url };
});
```

**Hook superpowers:**

```typescript
// Early return from hook - skip everything
app.register(hook('request', ({ request }) => {
  if (request.headers.get('authorization') !== 'secret') {
    // Returning Response skips routing, handlers, and response hooks
    return new Response('Unauthorized', { status: 401 });
  }
}));

// Handler returns native Response - skip response hooks
app.get('/stream', () => {
  // Native Response bypasses response hooks and global headers
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
});

// Handler returns object - goes through full pipeline
app.get('/data', () => {
  // Object goes through response hooks, global headers, serialization
  return { data: 'processed' };
});
```

Hooks are just functions. Compose them, test them, reuse them. No magic, no complexity.

## Choose Your Runtime, Keep Your Code

::: code-group

```typescript [Bun]
import { createApp } from '@minimajs/server/bun';
```

```typescript [Node.js]
import { createApp } from '@minimajs/server/node';
```

:::

Same API, same patterns, different runtimes. Switch between Bun and Node.js by changing a single import line.

**Embrace the Future of Web Development**

Minima.js represents a clean break from the past and a bold step into the future. Built for modern runtimes, powered by Web standards, and controlled by simple functions—this is web development, reimagined.
