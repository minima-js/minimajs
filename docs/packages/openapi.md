---
title: OpenAPI
sidebar_position: 2
---

# @minimajs/openapi

OpenAPI 3.1 specification generator for MinimaJS with automatic schema extraction and route documentation.

## Installation

```bash
bun add @minimajs/openapi
```

For schema integration (recommended):

```bash
bun add @minimajs/openapi @minimajs/schema zod
```

## Features

- OpenAPI 3.1 specification generation
- Automatic schema extraction from `@minimajs/schema`
- Route descriptors for operation metadata
- Path parameter detection from routes
- Support for query parameters, headers, request/response bodies
- Multiple response status codes
- Security scheme definitions
- Tag organization

## Quick Start

```typescript
import { createApp } from "@minimajs/server/bun";
import { openapi } from "@minimajs/openapi";

const app = createApp();

app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
  })
);

// OpenAPI spec available at GET /openapi.json
await app.listen({ port: 3000 });
```

## Route Descriptors

### `describe()` - Operation Metadata

Add OpenAPI operation metadata to routes:

```typescript
import { describe } from "@minimajs/openapi";

app.get("/users", describe({
  summary: "List all users",
  description: "Returns a paginated list of users.",
  tags: ["Users"],
  operationId: "listUsers",
}), () => {
  return getUsers();
});

app.post("/users", describe({
  summary: "Create a user",
  tags: ["Users"],
  operationId: "createUser",
}), () => {
  return createUser();
});
```

#### Available Options

| Option | Type | Description |
|--------|------|-------------|
| `summary` | `string` | Short operation summary |
| `description` | `string` | Detailed description (Markdown supported) |
| `tags` | `string[]` | Tags for grouping operations |
| `operationId` | `string` | Unique operation identifier |
| `deprecated` | `boolean` | Mark as deprecated |
| `security` | `array` | Operation-level security requirements |
| `externalDocs` | `object` | Link to external documentation |
| `servers` | `array` | Operation-specific servers |
| `parameters` | `array` | Additional parameters |
| `requestBody` | `object` | Request body (if not using schema) |
| `responses` | `object` | Responses (if not using schema) |

### `internal()` - Exclude from OpenAPI

Mark routes as internal to exclude them from the specification:

```typescript
import { internal } from "@minimajs/openapi";

// These won't appear in OpenAPI docs
app.get("/health", internal(), () => "ok");
app.get("/metrics", internal(), () => getMetrics());
app.get("/openapi.json", internal(), () => spec); // Auto-excluded
```

### Module-Level Descriptors

Apply descriptors to all routes in a module:

```typescript
import { descriptor } from "@minimajs/server/plugins";
import { describe } from "@minimajs/openapi";

// src/users/module.ts
export const meta = {
  plugins: [
    descriptor(describe({ tags: ["Users"] })),
  ],
};

export default async function (app) {
  app.get("/", () => getUsers());       // Tagged: Users
  app.post("/", () => createUser());    // Tagged: Users
  app.get("/:id", () => getUser());     // Tagged: Users
}
```

Combine multiple descriptors:

```typescript
export const meta = {
  plugins: [
    descriptor(
      describe({ tags: ["Admin"], security: [{ bearerAuth: [] }] }),
      [kAdminOnly, true]
    ),
  ],
};
```

## Schema Integration

Use `@minimajs/schema` to automatically document request/response shapes.

### Request Body

```typescript
import { schema, createBody, createResponse } from "@minimajs/schema";
import { describe } from "@minimajs/openapi";
import { z } from "zod";

const CreateUser = createBody(
  z.object({
    name: z.string().min(1).describe("User's full name"),
    email: z.string().email().describe("User's email address"),
    role: z.enum(["admin", "user"]).default("user"),
  })
);

const UserResponse = createResponse(201, z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string().datetime(),
}));

app.post(
  "/users",
  describe({ summary: "Create user", tags: ["Users"] }),
  schema(CreateUser, UserResponse),
  () => {
    const body = CreateUser();
    return UserResponse({
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
    });
  }
);
```

### Query Parameters

```typescript
import { createSearchParams, schema } from "@minimajs/schema";

const ListParams = createSearchParams({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.enum(["name", "createdAt", "-name", "-createdAt"]).optional(),
});

app.get(
  "/users",
  describe({ summary: "List users", tags: ["Users"] }),
  schema(ListParams),
  () => {
    const { page, limit, search, sort } = ListParams();
    return getUsers({ page, limit, search, sort });
  }
);
```

### Path Parameters

```typescript
import { createParams, schema } from "@minimajs/schema";

const UserParams = createParams({
  id: z.string().uuid().describe("User ID"),
});

app.get(
  "/users/:id",
  describe({ summary: "Get user by ID", tags: ["Users"] }),
  schema(UserParams),
  () => {
    const { id } = UserParams();
    return getUser(id);
  }
);
```

### Headers

```typescript
import { createHeaders, schema } from "@minimajs/schema";

const AuthHeaders = createHeaders({
  authorization: z.string().describe("Bearer token"),
  "x-request-id": z.string().uuid().optional(),
});

app.get(
  "/protected",
  describe({ summary: "Protected endpoint" }),
  schema(AuthHeaders),
  () => {
    const { authorization } = AuthHeaders();
    return { authenticated: true };
  }
);
```

### Multiple Response Status Codes

```typescript
const SuccessResponse = createResponse(200, z.object({ data: z.any() }));

const NotFoundResponse = createResponse(404, z.object({
  error: z.string(),
  code: z.literal("NOT_FOUND"),
}));

const ValidationError = createResponse(400, z.object({
  error: z.string(),
  code: z.literal("VALIDATION_ERROR"),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })),
}));

app.get(
  "/users/:id",
  schema(SuccessResponse, NotFoundResponse, ValidationError),
  () => {
    // Handler logic
  }
);
```

### Response Headers

```typescript
import { createResponseHeaders, createResponse, schema } from "@minimajs/schema";

const DownloadResponse = createResponse(200, z.instanceof(Blob));
const DownloadHeaders = createResponseHeaders({
  "content-type": z.string(),
  "content-disposition": z.string(),
  "content-length": z.string(),
});

app.get(
  "/files/:id/download",
  schema(DownloadResponse, DownloadHeaders),
  () => {
    // Return file blob
  }
);
```

## Plugin Configuration

### Basic Configuration

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API description with **Markdown** support",
    },
  })
);
```

### Custom Endpoint Path

```typescript
app.register(
  openapi({
    path: "/api/v1/openapi.json",
    info: { title: "My API", version: "1.0.0" },
  })
);
```

### Tags

Define tags for organizing operations:

```typescript
app.register(
  openapi({
    info: { title: "My API", version: "1.0.0" },
    tags: [
      { name: "Users", description: "User management" },
      { name: "Products", description: "Product catalog" },
      { name: "Orders", description: "Order processing" },
    ],
  })
);
```

### Security Schemes

```typescript
app.register(
  openapi({
    info: { title: "My API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT authentication",
        },
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API key authentication",
        },
        oauth2: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://auth.example.com/authorize",
              tokenUrl: "https://auth.example.com/token",
              scopes: {
                "read:users": "Read user data",
                "write:users": "Modify user data",
              },
            },
          },
        },
      },
    },
    // Apply globally
    security: [{ bearerAuth: [] }],
  })
);
```

### Servers

```typescript
app.register(
  openapi({
    info: { title: "My API", version: "1.0.0" },
    servers: [
      { url: "https://api.example.com", description: "Production" },
      { url: "https://staging-api.example.com", description: "Staging" },
      { url: "http://localhost:3000", description: "Development" },
    ],
  })
);
```

### Full Configuration Example

```typescript
app.register(
  openapi({
    path: "/openapi.json",
    info: {
      title: "E-Commerce API",
      version: "2.1.0",
      description: `
# E-Commerce API

Complete API for managing products, orders, and users.

## Authentication

All endpoints require Bearer token authentication unless marked as public.
      `,
      termsOfService: "https://example.com/terms",
      contact: {
        name: "API Support",
        url: "https://example.com/support",
        email: "api@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      { url: "https://api.example.com/v2", description: "Production" },
      { url: "https://sandbox.example.com/v2", description: "Sandbox" },
    ],
    tags: [
      { name: "Products", description: "Product catalog management" },
      { name: "Orders", description: "Order processing and fulfillment" },
      { name: "Users", description: "User account management" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    externalDocs: {
      description: "Full Developer Documentation",
      url: "https://docs.example.com",
    },
  })
);
```

## Programmatic Generation

Generate the OpenAPI document without registering an endpoint:

```typescript
import { generateOpenAPIDocument } from "@minimajs/openapi";

const spec = generateOpenAPIDocument(app, {
  info: { title: "My API", version: "1.0.0" },
});

// Write to file
await Bun.write("openapi.json", JSON.stringify(spec, null, 2));

// Or use in tests
expect(spec.paths["/users"].get.summary).toBe("List users");
```

## API Reference

### `openapi(options)`

Creates an OpenAPI plugin that serves the specification.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `/openapi.json` | Endpoint path for the spec |
| `info` | `InfoObject` | **required** | API metadata |
| `servers` | `ServerObject[]` | `[]` | Server configurations |
| `tags` | `TagObject[]` | `[]` | Tag definitions |
| `security` | `SecurityRequirementObject[]` | - | Global security |
| `components` | `ComponentsObject` | - | Reusable components |
| `externalDocs` | `ExternalDocumentationObject` | - | External docs link |

### `generateOpenAPIDocument(app, options)`

Generates the OpenAPI document programmatically.

**Parameters:**
- `app` - MinimaJS application instance
- `options` - Same as `openapi()` options except `path`

**Returns:** `OpenAPI.Document`

### `describe(options)`

Creates a route descriptor for OpenAPI operation metadata.

**Parameters:** `Partial<OpenAPI.OperationObject>`

**Returns:** `RouteMetaDescriptor`

### `internal()`

Creates a route descriptor that excludes the route from OpenAPI.

**Returns:** `RouteMetaDescriptor`

## Swagger UI Integration

Serve Swagger UI alongside your OpenAPI spec:

```typescript
import { openapi } from "@minimajs/openapi";

app.register(
  openapi({
    info: { title: "My API", version: "1.0.0" },
  })
);

// Serve Swagger UI
app.get("/docs", () => {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: "#swagger-ui",
          });
        </script>
      </body>
    </html>
  `, {
    headers: { "content-type": "text/html" },
  });
});
```

## See Also

- [Schema Package](/packages/schema) - Request/response validation
- [Route Descriptors](/guides/route-descriptors) - Custom metadata
- [Descriptor Plugin](/plugins/descriptor) - Module-level metadata
