# @minimajs/server

## 0.9.0

### Minor Changes

- 8874965: openapi support

## 0.8.0

### Minor Changes

- 9f5fe69: Middleware Support and Configurable Execution Context

  This release adds comprehensive middleware support and makes the execution context system configurable:

  **New Features:**
  - Middleware support for request/response pipeline customization
  - Exposed `executionContext` for advanced async context management
  - Exposed `contextProvider` making context handling fully configurable
  - Enhanced request lifecycle control

  **Use Cases:**
  - Logging and monitoring middleware
  - Error handling middleware
  - Custom context injection

  These changes enable more flexible application architecture while maintaining backward compatibility.

## 0.7.0

### Minor Changes

- 305a67d: ### Added
  - Automatic module discovery for files named `module.{js,ts}`
  - Controllers API via `controller(import('./controller'), ['GET / getList'])`

  ### Changed
  - Enabled body parser and route logger by default
  - Renamed `RouteHandler` to `Handler`

## 0.6.0

### Minor Changes

- 66a7ab2: Performance and API improvements:
  1. Fixed web response to Node.js response conversion
  2. Replaced Maps with plain objects for better performance
  3. Added proper type definitions to the register function
  4. Implemented adapter for IP resolution
  5. Removed URL parsing in favor of custom pathname extraction
  6. Improved IP, host, and protocol support by introducing proxy plugin
  7. Removed unnecessary hooks and changed transform hook execution order from FIFO to LIFO

## 0.5.1

### Patch Changes

- 2e84347: Fixed hooks leaking with async functions

## 0.5.0

### Minor Changes

- e2221a5: ## Core Rewrite: Web-Native APIs with Universal Runtime Support

  Complete rewrite of core packages from the ground up with the following improvements:
  - **Web-Native APIs**: Built using standard Web APIs for better compatibility and performance
  - **Platform Independent**: First-class support for both Node.js and Bun runtimes
  - **Modern Architecture**: Cleaner, more maintainable codebase with improved type safety
  - **Enhanced Performance**: Optimized for modern JavaScript engines

  This is a foundational change that improves the framework's portability and future-proofing across different JavaScript runtimes.

## 0.4.0

### Minor Changes

- b3c1c3c: re-written more DX friendly ever.

## 0.3.0

### Minor Changes

- Update fastify@5, error handler accept abort and other packages update
