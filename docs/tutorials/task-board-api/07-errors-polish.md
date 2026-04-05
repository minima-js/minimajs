---
title: "7. Error Handling & Polish"
---

# Step 7: Error Handling & Polish

## Step Outcome

After this step, your API has production-facing polish:

- consistent error response shape
- centralized unhandled error logging
- validation issue normalization
- complete, coherent API surface for demos and onboarding

## Centralized Error Format

By default, `abort` errors render themselves. To give every error response a consistent shape across the API, override `HttpError.toJSON` once at startup.

Add this to `src/index.ts` before `app.listen`:

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/node";
import { HttpError } from "@minimajs/server/error";

// Consistent error shape for the entire API
HttpError.toJSON = (err) => ({
  success: false,
  error: {
    message: err.response,
    statusCode: err.status,
  },
});

const app = createApp();

const address = await app.listen({ port: 3000 });
console.log(`Task Board API running at ${address}`);
```

:::

Now every HTTP error — whether from `abort.notFound()`, `abort("Unauthorized", 401)`, or a validation failure — returns:

::: code-group

```json [Error Response]
{
  "success": false,
  "error": {
    "message": "Workspace not found",
    "statusCode": 404
  }
}
```

:::

## Global Error Hook

For logging errors and catching unhandled exceptions, add an `error` hook to the root module:

::: code-group

```typescript [src/module.ts]
// src/module.ts
import { type Meta, hook, abort } from "@minimajs/server";
import { cors, shutdown } from "@minimajs/server/plugins";
import { authPlugin } from "./auth/index.js";
import { dbLifespan } from "./database.js";

export const meta: Meta = {
  plugins: [
    dbLifespan,
    cors({
      origin: process.env.ALLOWED_ORIGIN ?? "*",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    shutdown(),

    hook("request", ({ request, pathname }) => {
      console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    }),

    authPlugin,

    // Centralized error handling
    hook("error", (error) => {
      // Let expected HTTP errors use the standard serializer.
      if (abort.is(error)) {
        throw error;
      }

      console.error("[Unhandled Error]", error);
      abort({ message: "Internal server error" }, 500);
    }),
  ],
};
```

:::

## Validation Error Format

Override the validation error shape from `@minimajs/schema` to match the same API format:

::: code-group

```typescript [src/index.ts]
// src/index.ts
import { ValidationError } from "@minimajs/schema/error";

ValidationError.toJSON = (err) => ({
  success: false,
  error: {
    message: "Validation failed",
    statusCode: 400,
    issues: err.issues?.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  },
});
```

:::

## Final Project Structure

::: code-group

```text [Project Tree]
src/
├── index.ts          # Entry + error format overrides
├── module.ts         # Global plugins: CORS, auth, DB, logging, error hook
├── database.ts       # Prisma instance + lifespan hook
├── auth/
│   ├── index.ts      # createAuth, token helpers
│   ├── guards.ts     # authenticated, workspaceMember, boardMember, workspaceAdmin
│   └── module.ts     # /auth/register, /login, /refresh, /logout
├── workspaces/
│   └── module.ts     # GET|POST|PATCH|DELETE /workspaces
├── boards/
│   └── module.ts     # /workspaces/:workspaceId/boards
├── tasks/
│   └── module.ts     # /boards/:boardId/tasks + attachments
└── members/
    └── module.ts     # /workspaces/:workspaceId/members
```

:::

## Complete API Surface

| Method   | Path                                     | Auth     | Description                |
| -------- | ---------------------------------------- | -------- | -------------------------- |
| `POST`   | `/auth/register`                         | —        | Create account             |
| `POST`   | `/auth/login`                            | —        | Get access + refresh token |
| `POST`   | `/auth/refresh`                          | cookie   | Rotate access token        |
| `POST`   | `/auth/logout`                           | —        | Clear refresh token cookie |
| `GET`    | `/workspaces`                            | ✓        | List user's workspaces     |
| `POST`   | `/workspaces`                            | ✓        | Create workspace           |
| `GET`    | `/workspaces/:id`                        | ✓ member | Get workspace              |
| `PATCH`  | `/workspaces/:id`                        | ✓ admin  | Update workspace           |
| `DELETE` | `/workspaces/:id`                        | ✓ admin  | Delete workspace           |
| `GET`    | `/workspaces/:workspaceId/members`       | ✓ member | List members               |
| `POST`   | `/workspaces/:workspaceId/members`       | ✓ admin  | Invite member              |
| `PATCH`  | `/workspaces/:workspaceId/members/:id`   | ✓ admin  | Update role                |
| `DELETE` | `/workspaces/:workspaceId/members/:id`   | ✓ admin  | Remove member              |
| `GET`    | `/workspaces/:workspaceId/boards`        | ✓ member | List boards                |
| `POST`   | `/workspaces/:workspaceId/boards`        | ✓ member | Create board               |
| `PATCH`  | `/workspaces/:workspaceId/boards/:id`    | ✓ admin  | Update board               |
| `DELETE` | `/workspaces/:workspaceId/boards/:id`    | ✓ admin  | Delete board               |
| `GET`    | `/boards/:boardId/tasks`                 | ✓ member | List tasks (paginated)     |
| `POST`   | `/boards/:boardId/tasks`                 | ✓ member | Create task                |
| `PATCH`  | `/boards/:boardId/tasks/:id`             | ✓ member | Update task                |
| `DELETE` | `/boards/:boardId/tasks/:id`             | ✓ member | Delete task                |
| `POST`   | `/boards/:boardId/tasks/:id/attachments` | ✓ member | Upload attachment          |

## What You've Learned

You've now built a production-grade REST API using virtually every major feature of Minima.js:

- **File-based modules** — zero configuration, folder = URL prefix
- **`createAuth` + `@minimajs/auth`** — type-safe auth with required/optional modes and guards
- **`@minimajs/cookie`** — `httpOnly` refresh token storage
- **`@minimajs/schema`** — Zod validation for body, searchParams, with zero boilerplate error handling
- **`@minimajs/multipart`** — file uploads with size limits and disk persistence
- **`hook.lifespan`** — clean DB connect/disconnect lifecycle
- **`hook("request")`** — logging and auth guards scoped to modules
- **`hook("error")`** — centralized error handling with proper re-throw
- **`abort` helpers** — semantic HTTP errors throughout
- **`HttpError.toJSON`** — single place to define API error format
- **`export const routes: Routes`** — handlers wired directly in the module, no extra files
- **`cors` + `shutdown`** — production-ready global plugins

## 5-Minute Demo Script (For Presenting Minima.js)

Use this live flow when introducing Minima.js to other developers:

1. Show `src/module.ts` and explain global composition (`meta.plugins`).
2. Show one feature module (`src/workspaces/module.ts`) and point out `routes` + hooks in one file.
3. Run `POST /auth/login`, then `GET /workspaces` with Bearer token.
4. Trigger a controlled error (`GET /workspaces/999`) to show consistent error JSON.
5. Open `/openapi.json` to prove docs are generated from real route metadata.

This sequence demonstrates Minima.js value quickly: minimal boilerplate, strong structure, and predictable runtime behavior.

## Final Verification Checklist

- `npm run dev` starts without runtime errors.
- `POST /auth/register` and `POST /auth/login` succeed.
- Protected routes reject missing/invalid Bearer tokens.
- Workspace-scoped routes enforce role checks.
- Task attachment upload writes files to `./uploads/attachments`.
- Error responses follow the `HttpError.toJSON` shape.

## Next Steps

- **[OpenAPI](/packages/openapi)** — Auto-generate API docs from your routes
- **[Testing Guide](/guides/testing)** — Test handlers with `app.handle()` and `createRequest()`
- **[JWT Authentication Recipe](/cookbook/jwt-authentication)** — Deeper JWT patterns
- **[Advanced: Module Discovery](/advanced/module-discovery)** — Customize how modules are found
