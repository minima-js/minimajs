---
title: "MinimaJS vs. The Crowd"
sidebar_position: 2
---

# MinimaJS vs. Other Frameworks

Choosing the right framework can be overwhelming. This guide compares MinimaJS with popular alternatives to help you understand what makes Minima.js fundamentally different.

## The Fundamental Difference

Most Node.js frameworks are built on top of other frameworks, creating layers of abstraction. **Minima.js is built from scratch**—no Express, no Fastify, no legacy dependencies. This architectural choice enables capabilities that simply aren't possible with wrapper-based frameworks.

## Feature Comparison

While Minima.js shares goals with other frameworks, its from-scratch architecture leads to fundamental differences in developer experience, performance, and capabilities.

| Feature              | Minima.js                          | Express              | Fastify                | NestJS                    |
| -------------------- | ---------------------------------- | -------------------- | ---------------------- | ------------------------- |
| **Architecture**     | **Built from scratch**             | Legacy (2010)        | Modern Node core       | Wrapper (Express/Fastify) |
| **Runtime Support**  | **Bun** + Node.js                  | Node.js only         | Node.js only           | Node.js only              |
| **Request/Response** | **Web API Standard**               | Node.js specific     | Node.js wrapper        | Inherited (Node.js)       |
| **Paradigm**         | Functional, Hooks                  | Middleware chain     | Plugins, Encapsulation | OOP, Decorators, DI       |
| **TypeScript**       | First-class, built-in              | Community types      | Schema-driven          | First-class, integral     |
| **Async Context**    | **Built-in (`AsyncLocalStorage`)** | Manual prop-drilling | Request decorators     | DI / Providers            |
| **Performance**      | **Highest** (Bun-native)           | Moderate             | High                   | High (with Fastify)       |
| **Learning Curve**   | Minimal                            | Low                  | Moderate               | Steep                     |

**Key Takeaways:**

- **Performance & Modernity**: Minima.js's main advantage comes from its native Bun support and clean, from-scratch architecture, which avoids the legacy baggage present in frameworks like Express and wrappers like NestJS.
- **Developer Experience**: Minima.js embraces a functional, minimal approach, leveraging modern features like `AsyncLocalStorage` for context. This contrasts sharply with NestJS's OOP, decorator, and DI-heavy paradigm (akin to Angular), and differs from Express's manual patterns and Fastify's plugin ecosystem.
- **Standards-Based**: By using the Web API `Request`/`Response` objects, Minima.js ensures code is more portable and aligned with modern JavaScript standards, unlike older frameworks tied to Node.js-specific objects.

### Philosophical Differences: Minima.js vs. NestJS

While the table above provides a high-level overview, the core difference between Minima.js and NestJS lies in their fundamental philosophy.

- **NestJS: Framework-Managed Abstraction**
  - NestJS brings patterns from Angular and Spring Boot to Node.js, heavily relying on decorators, dependency injection (DI), and a class-based (OOP) structure.
  - This "enterprise" approach abstracts away much of JavaScript's native functionality, which can feel familiar to developers from other ecosystems but adds layers of complexity and "magic."
  - Accessing request context or managing dependencies requires framework-specific APIs and a container-managed lifecycle.

- **Minima.js: Explicit Control and Simplicity**
  - Minima.js is designed to embrace JavaScript's functional nature. It avoids DI containers and decorators in favor of simple, composable functions.
  - Dependencies are explicit and local. Asynchronous context is managed via the native `AsyncLocalStorage` API, making request data available anywhere without framework boilerplate.
  - This results in a clearer execution flow, less magic, and code that is more aligned with modern JavaScript standards.
