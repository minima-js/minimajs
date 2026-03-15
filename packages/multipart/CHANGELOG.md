# @minimajs/multipart

## 1.3.0

### Minor Changes

- 4b503ea: ## AbortSignal support across the ecosystem

  All I/O operations now accept an optional `signal` option, allowing request cancellation to propagate through the full stack — from the HTTP layer down to cloud storage and file operations.

  ### `@minimajs/server`
  - Added `request.signal()` — returns the `AbortSignal` tied to the current request's lifecycle, which aborts when the client disconnects
  - Added `hook.once()` — registers a one-shot lifecycle hook that removes itself after its first execution

  ### `@minimajs/disk`

  All disk operations now accept `{ signal?: AbortSignal }`:
  `get`, `delete`, `exists`, `copy`, `move`, `metadata`, and `list` — the signal is forwarded to the underlying driver.

  ### `@minimajs/aws-s3` / `@minimajs/azure-blob`

  Updated drivers to accept and forward `AbortSignal` to their respective cloud SDK calls.

  ### `@minimajs/multipart`

  Replaced the internal `stop()` pattern with `AbortController`/`AbortSignal` for cleaner cancellation of multipart parsing in `file()`, `files()`, and `body()`.

  ### `@minimajs/openapi`

  Fixed module tag generation to use `/` as the separator between nested module names, and updated root module detection to use the new `kIsRoot`/`kRouteMeta` symbols.

### Patch Changes

- Updated dependencies [4b503ea]
  - @minimajs/server@0.11.0

## 1.2.0

### Minor Changes

- ccdfbbb: Native File API Support

  This release brings comprehensive multipart handling with native Web File API compatibility:

  **Four Consumption Modes:**
  - `multipart` - Buffered (small files, simple uploads)
  - `streaming` - Lazy buffer (recommended for large files)
  - `raw` - Unbuffered streams (advanced use cases)
  - `schema` - Disk-backed with Zod validation (type-safe uploads)

  **Key Features:**
  - Native File API compatibility - `TempFile` and `StreamFile` extend Web `File`
  - Return files directly from handlers with correct Content-Type
  - Zod validation with `z.file().mime().max()` for type-safe uploads
  - Automatic temp file cleanup via `defer()` mechanism
  - Comprehensive `helpers` module for file operations
  - Memory-efficient streaming for large files

  **Breaking Changes:**
  - Use `multipart.body()` instead of `multipart()`
  - File API: `file.stream()` is now a method (was property)
  - File API: `file.name` replaces `file.filename`

  See documentation for migration guide and examples.

### Patch Changes

- Updated dependencies [9f5fe69]
  - @minimajs/server@0.8.0

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
