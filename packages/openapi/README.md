# @minimajs/openapi

OpenAPI 3.1 specification generator for MinimaJS with Zod schema integration.

## Installation

```bash
bun add @minimajs/openapi @minimajs/schema zod
```

## Features

- Generate OpenAPI 3.1 specification automatically from your routes
- Zod schema integration via `@minimajs/schema`
- Automatic path parameter extraction
- Support for query parameters, headers, and request bodies
- Multiple response status codes
- Security scheme definitions
- Tags and operation metadata

## Usage

```typescript
import { createApp } from "@minimajs/server/bun";
import { openapi } from "@minimajs/openapi";
import { schema, createBody, createResponse } from "@minimajs/schema";
import { z } from "zod";

const app = createApp();

app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
  })
);

// The OpenAPI specification will be available at /openapi.json
```

### Custom OpenAPI Endpoint Path

```typescript
app.register(
  openapi({
    path: "/api/spec.json",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  })
);
```

## Route Documentation

Use `@minimajs/schema` to define request/response schemas that automatically appear in the OpenAPI spec.

### Request Body

```typescript
import { schema, createBody, createResponse } from "@minimajs/schema";
import { z } from "zod";

const userBody = createBody(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
);

const userResponse = createResponse(
  201,
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
  })
);

app.post("/users", schema(userBody, userResponse), () => {
  const { name, email } = userBody();
  return { id: crypto.randomUUID(), name, email };
});
```

### Query Parameters

```typescript
import { createSearchParams, createResponse, schema } from "@minimajs/schema";

const queryParams = createSearchParams({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

const listResponse = createResponse(
  z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  )
);

app.get("/users", schema(queryParams, listResponse), () => {
  const { page, limit, search } = queryParams();
  // Handler logic
  return [];
});
```

### Headers

```typescript
import { createHeaders, schema } from "@minimajs/schema";

const authHeaders = createHeaders({
  authorization: z.string(),
  "x-api-key": z.string().optional(),
});

app.get("/protected", schema(authHeaders), () => {
  const { authorization } = authHeaders();
  // Handler logic
  return { message: "Success" };
});
```

### Multiple Response Status Codes

```typescript
const successResponse = createResponse(
  200,
  z.object({ data: z.string() })
);

const errorResponse = createResponse(
  400,
  z.object({ error: z.string() })
);

const notFoundResponse = createResponse(
  404,
  z.object({ message: z.string() })
);

app.get(
  "/resource/:id",
  schema(successResponse, errorResponse, notFoundResponse),
  () => {
    // Handler logic
    return { data: "ok" };
  }
);
```

### Response Headers

```typescript
import { createResponseHeaders, createResponse, schema } from "@minimajs/schema";

const downloadResponse = createResponse(z.string());
const downloadHeaders = createResponseHeaders(
  z.object({
    "content-type": z.string(),
    "content-disposition": z.string(),
  })
);

app.get("/download", schema(downloadResponse, downloadHeaders), () => {
  // Handler logic
  return "file content";
});
```

## OpenAPI Configuration

### Tags

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
    tags: [
      {
        name: "users",
        description: "User management operations",
      },
      {
        name: "products",
        description: "Product catalog operations",
      },
    ],
  })
);
```

### Security Schemes

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
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
          name: "X-API-Key",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  })
);
```

### Servers

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "https://api.example.com",
        description: "Production",
      },
      {
        url: "https://staging-api.example.com",
        description: "Staging",
      },
      {
        url: "http://localhost:3000",
        description: "Development",
      },
    ],
  })
);
```

### Full Configuration

```typescript
app.register(
  openapi({
    info: {
      title: "My API",
      version: "2.0.0",
      description: "Complete API documentation",
      termsOfService: "https://example.com/terms",
      contact: {
        name: "API Support",
        url: "https://example.com/support",
        email: "support@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      { url: "https://api.example.com", description: "Production" },
    ],
    tags: [
      { name: "users", description: "User operations" },
    ],
    externalDocs: {
      description: "Full documentation",
      url: "https://docs.example.com",
    },
  })
);
```

## API Reference

### `openapi(options)`

Creates an OpenAPI plugin for your MinimaJS application.

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `info` | `object` | **Required.** API title, version, description, contact, license |
| `path` | `string` | OpenAPI spec endpoint path (default: `/openapi.json`) |
| `servers` | `array` | Server configurations |
| `tags` | `array` | Tag definitions |
| `security` | `array` | Global security requirements |
| `components` | `object` | OpenAPI components (schemas, security schemes) |
| `externalDocs` | `object` | External documentation link |

### `generateOpenAPIDocument(app, options)`

Generate the OpenAPI document programmatically without registering an endpoint.

```typescript
import { generateOpenAPIDocument } from "@minimajs/openapi";

const spec = generateOpenAPIDocument(app, {
  info: { title: "My API", version: "1.0.0" },
});
```

## License

MIT
