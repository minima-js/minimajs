# @minimajs/cli

## 0.0.5

### Patch Changes

- 8d50f53: fix circular deps on nodejs

## 0.0.4

### Patch Changes

- 6c54ffa: auto-detect package manager improvement

## 0.0.3

### Patch Changes

- bb0833f: Complete overhaul of `@minimajs/cli` internals and public API.

  **Breaking changes**
  - `defineConfig()` always returns a `ConfigFactory` function — previously it returned the plain object as-is when passed one directly

  **New features**
  - `definePlugins()` — type-safe helper for registering CLI plugins with `PluginsFactory` support
  - `runtime` refactored to a proper namespace with `runtime.detect()`, `runtime.detect.version()`, `runtime.bin()`, `runtime.isNode()`
  - `manifest.target()` — converts a Node.js engine semver range to an esbuild target string
  - `pkgm.isYarnBerry()`, `pkgm.version()`, `pkgm.add/remove/install/run()` — full package manager utility namespace
  - Re-exports `defineCommand` from `citty`, `runtime`, `pkgm`, `manifest` from the public index

  **Generators**
  - `add middleware` — scaffold middleware and auto-patch root `module.ts`
  - `add plugin` — scaffold plugin and auto-patch nearest `module.ts`, with module existence check
  - `add disk proto` — new protocol disk driver template (`createProtoDisk`)
  - Disk stubs (`file`, `s3`, `azure-blob`) now use `{{ instance }}` variable instead of hardcoded `disk`
  - Plugin stub updated to use `plugin()` wrapper instead of raw `Plugin` type

  **Fixes**
  - `printInfo()` now passes `{ mode: "start" }` to `loadConfig()` (was called with no args)
  - `start.ts`: entry validation moved before output path computation to avoid unsafe assertion

## 0.0.2

### Patch Changes

- 6383ac1: fix small bugs, added more features

## 0.0.1

### Patch Changes

- acc31ce: CLI for minimajs framework
