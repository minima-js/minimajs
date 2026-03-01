# @minimajs/schema

## 1.4.0

### Minor Changes

- 8874965: openapi support

### Patch Changes

- Updated dependencies [8874965]
  - @minimajs/server@0.9.0

## 1.3.0

### Minor Changes

- 66a7ab2: Performance and API improvements:
  1. Fixed web response to Node.js response conversion
  2. Replaced Maps with plain objects for better performance
  3. Added proper type definitions to the register function
  4. Implemented adapter for IP resolution
  5. Removed URL parsing in favor of custom pathname extraction
  6. Improved IP, host, and protocol support by introducing proxy plugin
  7. Removed unnecessary hooks and changed transform hook execution order from FIFO to LIFO

### Patch Changes

- Updated dependencies [66a7ab2]
  - @minimajs/server@0.6.0

## 1.2.0

### Minor Changes

- e2221a5: ## Core Rewrite: Web-Native APIs with Universal Runtime Support

  Complete rewrite of core packages from the ground up with the following improvements:
  - **Web-Native APIs**: Built using standard Web APIs for better compatibility and performance
  - **Platform Independent**: First-class support for both Node.js and Bun runtimes
  - **Modern Architecture**: Cleaner, more maintainable codebase with improved type safety
  - **Enhanced Performance**: Optimized for modern JavaScript engines

  This is a foundational change that improves the framework's portability and future-proofing across different JavaScript runtimes.

### Patch Changes

- Updated dependencies [e2221a5]
  - @minimajs/server@0.5.0

## 1.1.0

### Minor Changes

- b3c1c3c: re-written more DX friendly ever.

### Patch Changes

- Updated dependencies [b3c1c3c]
  - @minimajs/server@0.4.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @minimajs/server@0.3.0
