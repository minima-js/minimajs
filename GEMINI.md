# Gemini Code Assistant Context: Minima.js

This document provides context for the Gemini code assistant to understand the Minima.js project.

## Project Overview

Minima.js is a high-performance, TypeScript-first web framework for Node.js and Bun. It is built from scratch with zero dependencies on legacy frameworks like Express or Fastify.

The project is a monorepo managed with `pnpm` and `Turborepo`. The main packages are located in the `packages/` directory, with `@minimajs/server` being the core package.

**Key Architectural Principles:**

*   **Dual Runtime Support:** Provides native, optimized entry points for both Node.js (`@minimajs/server/node`) and Bun (`@minimajs/server/bun`).
*   **Web API Standards:** Uses native `Request` and `Response` objects, making it familiar to frontend and modern backend developers.
*   **Context-Aware API:** Leverages `AsyncLocalStorage` to provide global, request-scoped access to HTTP objects like `request`, `params`, `body`, etc. This eliminates the need for "prop drilling".
*   **Functional & Composable:** Encourages a functional approach with a powerful plugin and module system. Features are added by composing plugins and modules.
*   **Type-Safe:** Written entirely in TypeScript with a focus on type inference and safety.

## Building and Running

The project uses `bun` as the package manager and `turbo` as the monorepo build tool.

*   **Install Dependencies:**
    ```bash
    bun install
    ```

*   **Build all packages:**
    ```bash
    turbo build
    ```
    Or, from the root:
    ```bash
    bun run build
    ```

*   **Run all tests:**
    ```bash
    turbo test
    ```
    Or, from the root:
    ```bash
    bun run test
    ```
    The `@minimajs/server` package uses `bun test`.

*   **Linting:**
    ```bash
    bun run lint
    ```

*   **Run docs development server:**
    ```bash
    bun run docs
    ```

## Development Conventions

*   **Code Style:** The project uses Prettier for code formatting and ESLint for linting. Run `bun run format` and `bun run lint` before committing.
*   **API Design:** The framework follows a "composition-over-inheritance" and functional-first approach.
    *   **Modules** (`async` functions) create encapsulated scopes with their own routes and hooks.
    *   **Plugins** (created with the `plugin()` helper) extend the current scope, typically by registering hooks. They are the primary way to create middleware.
    *   The `compose` API is used to apply plugins (middleware) to modules or to group other plugins.
*   **Deprecations:** The `interceptor` API is deprecated and should not be used. The correct pattern for applying middleware is to wrap logic in a plugin and apply it with `compose.create()`.
*   **Error Handling:** The primary error handling mechanism is the `error` hook. The preferred way to signal an error is by using the `abort()` helper, which allows the framework to correctly process the error response and apply necessary headers. Returning `new Response()` from an error hook is discouraged as it bypasses framework features.
*   **File Uploads:** The `@minimajs/multipart` package provides a context-aware API. Helpers like `multipart.file()` and `multipart.files()` do not need the `request` object to be passed to them.

By following these conventions, we can ensure that the codebase remains clean, consistent, and easy to maintain.