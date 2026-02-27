# @minimajs/openapi

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
