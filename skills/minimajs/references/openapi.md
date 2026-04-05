# @minimajs/openapi — OpenAPI Reference

## Setup

Register the plugin on your root module to expose a `GET /openapi.json` endpoint:

```typescript
import { openapi } from "@minimajs/openapi";

export const meta: Meta = {
  prefix: "/api",
  plugins: [
    openapi({
      info: { title: "My API", version: "1.0.0", description: "..." },
      servers: [{ url: "https://api.example.com" }],
      // Any other OpenAPI 3.1 document fields
    }),
  ],
};
```

Options:

- `path` — endpoint path (default: `/openapi.json`)
- `info` — OpenAPI info object
- Any other top-level OpenAPI 3.1 document fields (`servers`, `components`, `security`, `tags`, etc.)

## describe() — operation metadata

Route descriptor to add OpenAPI operation metadata:

```typescript
import { describe } from "@minimajs/openapi";
import { handler } from "@minimajs/server";

export const routes: Routes = {
  "GET /users": handler(
    describe({
      summary: "List users",
      description: "Returns a paginated list of users",
      tags: ["Users"],
      operationId: "listUsers",
      deprecated: false,
      security: [{ bearerAuth: [] }],
      // Any OpenAPI operation fields
    }),
    listUsers
  ),
};
```

## schema() — request/response schemas

From `@minimajs/schema` — when used with `openapi`, automatically populates request body, parameters, and responses in the spec:

```typescript
import { schema } from "@minimajs/schema";
import { createBody, createParams, createSearchParams, createResponse } from "@minimajs/schema";
import { describe } from "@minimajs/openapi";
import { z } from "zod";

const getBody = createBody(z.object({ name: z.string(), email: z.string().email() }));
const getParams = createParams({ id: z.string().uuid() });
const getSearch = createSearchParams({ page: z.coerce.number().default(1) });
const UserResponse = createResponse(z.object({ id: z.string(), name: z.string() }));
const NotFound = createResponse(404, z.object({ message: z.string() }));

export const routes: Routes = {
  "POST /users": handler(
    describe({ summary: "Create user", tags: ["Users"] }),
    schema(getBody, UserResponse, NotFound),
    createUser
  ),
  "GET /users/:id": handler(
    describe({ summary: "Get user", tags: ["Users"] }),
    schema(getParams, UserResponse, NotFound),
    getUser
  ),
};
```

## internal() — exclude a route from the spec

```typescript
import { internal } from "@minimajs/openapi";

export const routes: Routes = {
  "GET /health": handler(internal(), healthCheck),
  "GET /openapi.json": handler(internal(), getSpec), // auto-excluded anyway
};
```

## Security schemes

Define reusable security schemes in the `openapi()` plugin config:

```typescript
openapi({
  info: { title: "My API", version: "1.0.0" },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
  },
  // Apply globally to all operations
  security: [{ bearerAuth: [] }],
});
```

Then reference in `describe()`:

```typescript
describe({ security: [{ bearerAuth: [] }] }); // override per-route
describe({ security: [] }); // mark as public (no auth)
```

## Programmatic spec generation

```typescript
import { generateOpenAPIDocument } from "@minimajs/openapi";

await app.ready();
const spec = generateOpenAPIDocument(app, {
  info: { title: "My API", version: "1.0.0" },
});
console.log(JSON.stringify(spec, null, 2));
```
