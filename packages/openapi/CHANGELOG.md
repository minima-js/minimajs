# @minimajs/openapi

## 0.3.0

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

## 0.2.0

### Minor Changes

- a1dd02d: ### Module Routes

  Module files can now export a `routes` object to declaratively register routes. This replaces the previous `app.get/post/...` pattern inside module functions.

  ```ts
  import type { Routes } from "@minimajs/server";

  export const routes: Routes = {
    "GET /list": () => getUsers(),
    "POST /create": () => createUser(),
  };
  ```

  ### OpenAPI: Auto-detected Tags

  The OpenAPI plugin now automatically infers tags from the module's directory structure. Routes inside `src/users/module.ts` will be tagged `["Users"]` by default, eliminating the need to manually specify tags for most routes.

### Patch Changes

- Updated dependencies [a1dd02d]
  - @minimajs/server@0.10.0

## 0.1.0

### Minor Changes

- 8874965: openapi support

### Patch Changes

- Updated dependencies [8874965]
  - @minimajs/server@0.9.0
