---
title: "7. Error Handling & Polish"
---

# Step 7: Error Handling & Polish

## Centralized Error Format

By default, `abort` errors render themselves. To give every error response a consistent shape across the API, override `HttpError.toJSON` once at startup.

Add this to `src/index.ts` before `app.listen`:

```typescript
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

Now every HTTP error — whether from `abort.notFound()`, `abort.unauthorized()`, or a validation failure — returns:

```json
{
  "success": false,
  "error": {
    "message": "Workspace not found",
    "statusCode": 404
  }
}
```

## Global Error Hook

For logging errors and catching unhandled exceptions, add an `error` hook to the root module:

```typescript
// src/module.ts
import { type Meta, hook, abort } from "@minimajs/server";
import { cors, gracefulShutdown } from "@minimajs/server/plugins";
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
    gracefulShutdown(),

    hook("request", ({ request, pathname }) => {
      console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    }),

    authPlugin,

    // Centralized error handling
    hook("error", (error) => {
      // Log unexpected errors
      if (!abort.is(error)) {
        console.error("[Unhandled Error]", error);
        abort({ message: "Internal server error" }, 500);
      }
      // HTTP errors are re-thrown to use the HttpError.toJSON format
      throw error;
    }),
  ],
};
```

## Validation Error Format

Override the validation error shape from `@minimajs/schema` to match the same API format:

```typescript
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

## Final Project Structure

```
src/
├── index.ts          # Entry + error format overrides
├── module.ts         # Global plugins: CORS, auth, DB, logging, error hook
├── database.ts       # Prisma instance + lifespan hook
├── auth/
│   ├── index.ts      # createAuth, token helpers
│   ├── guards.ts     # authenticated, workspaceMember, workspaceAdmin
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

## Complete API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Get access + refresh token |
| `POST` | `/auth/refresh` | cookie | Rotate access token |
| `POST` | `/auth/logout` | — | Clear refresh token cookie |
| `GET` | `/workspaces` | ✓ | List user's workspaces |
| `POST` | `/workspaces` | ✓ | Create workspace |
| `GET` | `/workspaces/:id` | ✓ member | Get workspace |
| `PATCH` | `/workspaces/:id` | ✓ admin | Update workspace |
| `DELETE` | `/workspaces/:id` | ✓ admin | Delete workspace |
| `GET` | `/workspaces/:workspaceId/members` | ✓ member | List members |
| `POST` | `/workspaces/:workspaceId/members` | ✓ admin | Invite member |
| `PATCH` | `/workspaces/:workspaceId/members/:id` | ✓ admin | Update role |
| `DELETE` | `/workspaces/:workspaceId/members/:id` | ✓ admin | Remove member |
| `GET` | `/workspaces/:workspaceId/boards` | ✓ member | List boards |
| `POST` | `/workspaces/:workspaceId/boards` | ✓ member | Create board |
| `PATCH` | `/workspaces/:workspaceId/boards/:id` | ✓ admin | Update board |
| `DELETE` | `/workspaces/:workspaceId/boards/:id` | ✓ admin | Delete board |
| `GET` | `/boards/:boardId/tasks` | ✓ member | List tasks (paginated) |
| `POST` | `/boards/:boardId/tasks` | ✓ member | Create task |
| `PATCH` | `/boards/:boardId/tasks/:id` | ✓ member | Update task |
| `DELETE` | `/boards/:boardId/tasks/:id` | ✓ member | Delete task |
| `POST` | `/boards/:boardId/tasks/:id/attachments` | ✓ member | Upload attachment |

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
- **`cors` + `gracefulShutdown`** — production-ready global plugins

## Next Steps

- **[OpenAPI](/packages/openapi)** — Auto-generate API docs from your routes
- **[Testing Guide](/guides/testing)** — Test handlers with `app.handle()` and `createRequest()`
- **[JWT Authentication Recipe](/cookbook/jwt-authentication)** — Deeper JWT patterns
- **[Advanced: Module Discovery](/advanced/module-discovery)** — Customize how modules are found
