---
title: "Minima.js vs. The Crowd"
sidebar_position: 2
---

# Minima.js vs. Other Frameworks

Choosing the right framework is about finding the right tool for your specific needs. This guide compares Minima.js with popular alternatives to highlight where it fits in the modern backend landscape.

## The Minima.js Philosophy

Minima.js occupies a unique sweet spot:
1.  **Modern**: Built for **Bun** and **Node.js** using native APIs.
2.  **Standard**: Uses **Web API** standards (`Request`, `Response`, `File`) instead of framework-specific wrappers.
3.  **Context-Aware**: Eliminates prop-drilling with `AsyncLocalStorage`.
4.  **Minimal**: Zero boilerplate, file-based auto-discovery.

## Feature Comparison Matrix

| Feature | Minima.js | Express | Fastify | NestJS | Hono |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Runtime** | **Bun** & Node.js | Node.js | Node.js | Node.js | Edge / Multi-runtime |
| **API Style** | **Web Standards** | proprietary | proprietary | proprietary | Web Standards |
| **Routing** | **File-based + Code** | Code-based | Code-based | Decorator-based | Code-based |
| **Context** | **Native `AsyncLocalStorage`** | `req` threading | `req` decorators | Dependency Injection | `c` context object |
| **TypeScript** | **First-class** | Community `@types` | Schema-driven | First-class | First-class |
| **Architecture** | **Functional / Modular** | Middleware chain | Plugin system | OOP / Angular-style | Functional |
| **Boilerplate** | **Low** | Low | Moderate | High | Low |

---

## vs. Express (The Legacy Standard)

**Express** is the grandfather of Node.js frameworks. It is stable but shows its age.

### The Difference
- **Async Handling**: Express 4 was designed for callbacks. Async/await support was patched in later. Minima.js is async-native.
- **Request/Response**: Express relies on Node.js's low-level `IncomingMessage` and `ServerResponse`. Minima.js uses the modern, portable `Request` and `Response` Web APIs.
- **Context**: In Express, you must attach data to the `req` object (`req.user = user`) and pass it through every middleware. Minima.js allows you to access `context()` or `headers()` from *any* function, anywhere in the call stack.

**Choose Minima.js if:** You want the simplicity of Express but with modern language features, better types, and 10x performance.

---

## vs. Fastify (The Performance King)

**Fastify** is an excellent framework that prioritized speed and low overhead. Minima.js actually shares some DNA with Fastify (using `find-my-way` for routing and `avvio` for booting), but takes a different philosophical approach.

### The Difference
- **API Surface**: Fastify creates its own proprietary `FastifyRequest` and `FastifyReply` objects with a large API surface area. Minima.js sticks to standard Web APIs (`Request`, `Response`), meaning zero learning curve if you know `fetch`.
- **Developer Experience**: Fastify relies heavily on schemas for serialization and validation to achieve speed. Minima.js offers great performance out of the box but prioritizes developer ergonomics (like file-based modules and context) over raw micro-optimizations that require verbose configuration.
- **Modules**: Fastify plugins are powerful but require manual registration. Minima.js provides **automatic file-based module discovery**, making project structure intuitive and consistent.

**Choose Minima.js if:** You want Fastify-grade architecture but prefer standard Web APIs and zero-config module organization.

---

## vs. NestJS (The Enterprise Framework)

**NestJS** is a heavy, opinionated framework heavily inspired by Angular and Spring Boot.

### The Difference
- **Complexity**: NestJS introduces a massive amount of concepts: Modules, Controllers, Providers, Services, Guards, Interceptors, Pipes, Decorators. Minima.js uses **functions and hooks**. That's it.
- **Dependency Injection**: NestJS relies on a complex DI container. Minima.js encourages using standard JavaScript/TypeScript patterns (imports, closures, and functions) which are easier to debug and test.
- **Verbosity**: A "Hello World" in NestJS involves multiple files and classes. In Minima.js, it's 3 lines of code.

### Code Comparison

**NestJS Request Scope:**
```typescript
@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(REQUEST) private request: Request) {}
}
```

**Minima.js Request Scope:**
```typescript
import { request } from "@minimajs/server";

export function getCat() {
  const req = request(); // Available anywhere, instantly
}
```

**Choose Minima.js if:** You want to build scalable applications without fighting the framework or writing "Java in JavaScript."

---

## vs. Hono (The Edge Contender)

**Hono** is a fantastic framework designed primarily for Edge runtimes (Cloudflare Workers, Deno, Bun).

### The Difference
- **Focus**: Hono is optimized for the Edge (small bundle size). Minima.js is optimized for **long-running Application Servers** (Node.js and Bun). This allows Minima.js to offer features like robust file uploading (`@minimajs/multipart`), file-system based module discovery, and deeper system integrations that aren't possible or efficient in Edge environments.
- **Context Passing**: Hono passes a context object `c` to every handler (`app.get('/', (c) => ...)`). You must pass this `c` object around to helpers. Minima.js uses `AsyncLocalStorage`, so your helpers can be pure functions that don't need context arguments.

**Choose Minima.js if:** You are building a backend server (Microservice, API, Monolith) on Bun or Node.js and want powerful, server-side features.
