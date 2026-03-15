# @minimajs/disk

## 0.0.3

### Patch Changes

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

## 0.0.2

### Patch Changes

- ed6e6fd: Initial launch of Disk, AWS S3, and Azure Blob packages with production-ready docs and examples.
