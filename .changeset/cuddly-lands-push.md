---
"@minimajs/openapi": minor
"@minimajs/server": minor
---

### Module Routes

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
